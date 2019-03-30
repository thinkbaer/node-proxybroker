import * as http from 'http'
import * as tls from 'tls'
import * as https from 'https'
import * as net from 'net'
import * as fs from 'fs'
import {DEFAULT_SERVER_OPTIONS, IServerOptions} from "./IServerOptions";
import {Log} from "../libs/generic/logging/Log";
import Exceptions from "../libs/specific/exceptions/Exceptions";
import TodoException from "../libs/generic/exceptions/TodoException";
import Timer = NodeJS.Timer;
import * as _ from 'lodash'

export interface IServerApi {

    beforeStart?(server: Server):Promise<any>;
}

export class Server {


    _options: IServerOptions;

    // _url: url.Url = null;

    _abort: boolean = false;

    _secured: boolean = true;

    _both: boolean = false;

    inc: number = 0;

    cache: { [key: number]: { t: Timer, s: net.Socket } } = {};

    server: net.Server = null;

    wrapper: IServerApi  = null

    fn: Function = null;

    private $connections: { [key: string]: net.Socket } = {};



    constructor(options: IServerOptions, wrapper: IServerApi = null) {
        this._options = _.defaultsDeep(options,DEFAULT_SERVER_OPTIONS);
        this._secured = /^https/.test(this._options.protocol);

        if (this._options.cert_file) {
            this._options.cert = fs.readFileSync(this._options.cert_file)
        }

        if (this._options.key_file) {
            this._options.key = fs.readFileSync(this._options.key_file)
        }

        if (this._options.ca_file) {
            this._options.ca = fs.readFileSync(this._options.ca_file)
        }

        if (this._options.fn) {
            if (typeof this._options.fn === 'function') {
                this.fn = this._options.fn
            } else if (typeof this._options.fn === 'string' && this[this._options.fn] && typeof this[this._options.fn] === 'function') {
                this.fn = this[this._options.fn]
            } else {
                throw new TodoException('wrong callback')
            }
        } else {
            this.fn = this.root
        }

        this.wrapper = wrapper
    }


    url(): string {
        return this._options.protocol + '://' + this._options.ip + ':' + this._options.port
    }

    get protocol(): string {
        return this._options.protocol
    }

    get stall(): number {
        return this._options.stall
    }

    set stall(n: number) {
        this._options.stall = n
    }

    get isSecured(): boolean {
        return this._secured;
    }



    response(req: http.IncomingMessage, res: http.ServerResponse) {
        let inc = this.inc++;
        let self = this;
        let t = setTimeout(function () {
            self._options.fn
            self.fn(req, res);
            clearTimeout(self.cache[inc].t);
            delete self.cache[inc]
        }, this.stall);
        this.cache[inc] = {t: t, s: req.socket}
    }


    createServer(): net.Server {
        let self = this;
        let server: net.Server = null;
        self.$connections = {};

        if (this._secured) {
            let https_server = https.createServer(this._options, this.response.bind(this));
            server = https_server
        } else {
            let http_server = http.createServer(this.response.bind(this));
            http_server.setTimeout(
                self._options.timeout, function (socket: net.Socket) {
                    self.debug('server timeout reached: ' + self._options.timeout);
                    // socket.end()
                    socket.destroy(Exceptions.newSocketTimeout());
                });
            server = http_server;
        }
        return server;
    }


    root(req: http.IncomingMessage, res: http.ServerResponse) {
        this.debug('process');
        res.writeHead(200, {"Content-Type": "application/json"});
        let data = {time: (new Date()).getTime(), headers: req.headers, rawHeaders: req.rawHeaders};
        let json = JSON.stringify(data);
        res.end(json);
    }


    shutdown(): Promise<any> {
        this._abort = true;
        for (let x in this.cache) {
            if (this.cache[x].t) {
                clearTimeout(this.cache[x].t)
            }
            if (this.cache[x].s) {
                this.cache[x].s.destroy()
            }
            delete this.cache[x]
        }
        return this.stop()
    }

    /**
     *
     *
     * @see https://nodejs.org/api/http.html#http_event_connect
     *
     * @param request
     * @param upstream
     * @param head
     */
    onServerConnect(request: http.IncomingMessage, upstream: net.Socket, head: Buffer): void {
        //this.debug('onServerConnect ' + this.url + '\n' + head.toString('utf8'));
/*
        let self = this;
        let rurl: url.Url = url.parse(`https://${request.url}`);

        let downstream = net.connect(parseInt(rurl.port), rurl.hostname, function () {
            self.debug('downstream connected to ' + request.url);
            upstream.write(
                'HTTP/' + request.httpVersion + ' 200 Connection Established\r\n' +
                'Proxy-agent: Proxybroker\r\n' +
                '\r\n');

            downstream.write(head);
            downstream.pipe(upstream);
            upstream.pipe(downstream)
        });
        */
    }

    /*
    onServerConnectData(data: Buffer): void {
        // this.debug('onServerConnectData ' + data.toString('utf-8'))
    }
    */


    onServerUpgrade(request: http.IncomingMessage, socket: net.Socket, head: Buffer): void {
        // this.debug('onServerUpgrade ' + this._options.url)
    }

    onServerClientError(exception: Error, socket: net.Socket): void {
        // this.debug('onServerClientError ' + this._options.url)
        this.debug('Server->onServerClientError ' + this.url() + ' ['+socket['handle_id']+']', exception)
        socket.destroy(exception)

    }

    onServerError(exception: Error, socket: net.Socket): void {
        this.debug('Server->onServerError ' + this.url(), exception)
    }

    onServerClose(): void {
        // this.debug('onServerClose ' + this._options.url)
    }

    onServerConnection(socket: net.Socket, secured:boolean = false): void {
        this.debug('Server->onServerConnection secured='+secured+' '+ this.url())
        // register connection
        let self = this
        let key = socket.remoteAddress + ':' + socket.remotePort;
        this.$connections[key] = socket;
        socket.once('close', function () {
            delete self.$connections[key];
        })

    }

    onSecureConnection(socket: tls.TLSSocket): void {
        this.onServerConnection(socket,true)

    }

    // private onServerConnection(socket: net.Socket): void {  }

    async start(done: Function = null): Promise<any> {
        let self = this;
        this.prepare();
        this.server = this.createServer();

        if (this.isSecured) {
            this.server.on('secureConnection', this.onSecureConnection.bind(this))
        } else {
            this.server.on('connection', this.onServerConnection.bind(this))
        }

        // this.server.on('upgrade', this.onServerUpgrade.bind(this));
        this.server.on('clientError', this.onServerClientError.bind(this));
        this.server.on('close', this.onServerClose.bind(this));
        this.server.on('connect', this.onServerConnect.bind(this));
        this.server.on('error', this.onServerError.bind(this));

        if(this.wrapper && this.wrapper.beforeStart){
            await this.wrapper.beforeStart(this)
        }

        let p = new Promise(function (resolve, reject) {
            self.server.once('error', (err) => {
                let nErr = Exceptions.handle(err);
                if (nErr.code === Exceptions.EADDRINUSE) {
                    reject(err)
                } else {
                    Log.error('server error:', err)
                }
            });

            self.server = self.server.listen(self._options.port, self._options.ip, () => {
                self.debug('start server on ' + self.url() + ' (SSL: '+self.isSecured+')');
                resolve()
            });
        });

        if (done) {
            await p;
            done()
        } else {
            return p;
        }
    }


    async stop(done: Function = null): Promise<any> {
        let self = this;
        await this.preFinalize()
        let p = new Promise(function (resolve) {
            if (self.server) {
                self.server.removeAllListeners();

                for (let conn in self.$connections) {
                    self.$connections[conn].destroy()
                }

                self.server.close(function () {
                    self.server = null;
                    self.debug('stop server ' + self.url());
                    resolve(true)
                })
            } else {
                resolve(false)
            }
        });

        if (done) {
            await p;
            await self.finalize();
            done()
        } else {
            await self.finalize();
            return p;
        }
    }

    prepare(): void {
    }

    finalize(): void {
    }

    preFinalize(): void {
    }


    debug(...msg: any[]) {
        Log.debug.apply(Log, msg)
    }

}
