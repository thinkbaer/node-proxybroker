
import * as http from 'http'
import * as tls from 'tls'
import * as https from 'https'
import * as net from 'net'
import * as fs from 'fs'
import * as url from "url";

import Timer = NodeJS.Timer;
import {IServerOptions} from "./IServerOptions";
import {Connection} from "typeorm";
import {Log} from "../logging/Log";


export class Server {

    static readonly defaultOptions: IServerOptions = {
        url: 'http://localhost:3128',
        stall: 0,
        timeout: 10000,
        //dual_protocol:false,
        _debug: false
    };

    _options: IServerOptions;
    _url: url.Url = null;
    _abort: boolean = false;
    _secured: boolean = true;
    _both: boolean = false;


    inc: number = 0;
    cache: { [key: number]: { t: Timer, s: net.Socket } } = {};

    server: net.Server = null;
    //server_instance: { [key: string]: net.Server }
    //server_port: { [key: string]: number }

    constructor(options: IServerOptions) {
        this._options = Object.assign({}, Server.defaultOptions, options);
        this._url = url.parse(options.url);
      //  this._both = this._options.dual_protocol
        this._secured = /^https/.test(this.protocol);

        // if(this._secured && this._both){
        //     let port = parseInt(this._url.port)
        //     this.server_port['http'] = port++
        //     this.server_port['https'] = port++
        // }


        if (this._options.cert_file) {
            this._options.cert = fs.readFileSync(this._options.cert_file)
        }

        if (this._options.key_file) {
            this._options.key = fs.readFileSync(this._options.key_file)
        }

        if (this._options.ca_file) {
            this._options.ca = fs.readFileSync(this._options.ca_file)
        }


    }


    url(): string {
        return url.format(this._url)
    }


    set stall(n: number) {
        this._options.stall = n
    }

    get stall(): number {
        return this._options.stall
    }


    response(req: http.IncomingMessage, res: http.ServerResponse) {
        let inc = this.inc++;
        let self = this;
        let t = setTimeout(function () {
            self.root(req, res);
            clearTimeout(self.cache[inc].t);
            delete self.cache[inc]
        }, this.stall);
        this.cache[inc] = {t: t, s: req.socket}
    }

    // protocolDispatcher(conn:Connection) {
    //     let self = this
    //     conn.once('data', function (buf) {
    //         // A TLS handshake record starts with byte 22.
    //         var address = (buf[0] === 22) ? self.server_port['https'] : self.server_port['http'];
    //         var proxy = net.createConnection(address, function () {
    //             proxy.write(buf);
    //             conn.pipe(proxy).pipe(conn);
    //         });
    //     });
    // }


    createServer(): net.Server {
        let self = this;

        let server: net.Server = null;
        if (this._secured) {
            let https_server = https.createServer(this._options, this.response.bind(this));
            server = https_server
        } else {
            let http_server = http.createServer(this.response.bind(this));
            http_server.setTimeout(
                self._options.timeout, function (socket: net.Socket) {
                    self.debug('server timeout reached: ' + self._options.timeout);
                    socket.destroy();
                });
            server = http_server
        }

        return server
    }

    get protocol(): string {
        return this._url.protocol
    }


    root(req: http.IncomingMessage, res: http.ServerResponse) {
        this.debug('process');
        res.writeHead(200, {"Content-Type": "application/json"});
        let data = {time: (new Date()).getTime(), headers: req.headers, rawHeaders: req.rawHeaders};
        let json = JSON.stringify(data);
        res.end(json);
    }

    forcedShutdown() {
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
        this.stop(() => {
        })
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
    private onServerConnect(request: http.IncomingMessage, upstream: net.Socket, head: Buffer): void {
        this.debug('onServerConnect');
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
    }

    private onServerConnectData(data: Buffer): void {
        this.debug('onServerConnectData ' + data.toString('utf-8'))
    }

    private onServerUpgrade(request: http.IncomingMessage, socket: net.Socket, head: Buffer): void {
        this.debug('onServerUpgrade')
    }

    private onServerClientError(exception: Error, socket: net.Socket): void {
        this.debug('onServerClientError')
    }

    private onServerError(exception: Error, socket: net.Socket): void {
        this.debug('onServerError')
    }

    private onServerClose(): void {
        this.debug('onServerClose')
    }

    // private onServerConnection(socket: net.Socket): void {  }

    async start(done: Function = null): Promise<any> {
        let self = this;
        this.prepare();
        this.server = this.createServer();
        //      this.server.on('checkContinue',this.onServerCheckContinue.bind(this))
        //      this.server.on('checkExpectation',this.onServerCheckExpectation.bind(this))
        this.server.on('clientError', this.onServerClientError.bind(this));
        this.server.on('close', this.onServerClose.bind(this));
        //this.server.on('connection', this.onServerConnection.bind(this))
        this.server.on('upgrade', this.onServerUpgrade.bind(this));
        //      this.server.on('request',this.onServerRequest.bind(this))
        this.server.on('connect', this.onServerConnect.bind(this));
        this.server.on('error', this.onServerError.bind(this));

        let p = new Promise(function (resolve) {
            self.server = self.server.listen(parseInt(self._url.port), self._url.hostname, () => {
                self.debug('start server on ' + url.format(self._url));
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
        let p = new Promise(function (resolve) {
            if (self.server) {
                self.server.close(function () {
                    self.server = null;
                    self.debug('stop server');
                    resolve()
                })
            } else {
                resolve()
            }
        });

        if (done) {
            await p;
            self.finalize();
            done()
        } else {
            self.finalize();
            return p;
        }
    }

    prepare(): void {
    }

    finalize(): void {
    }


    debug(...msg: string[]) {
        if (this._options._debug) {
            Log.debug.apply(Log, msg)
        }
    }

}
