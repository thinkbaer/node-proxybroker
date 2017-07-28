import * as http from "http";
import * as https from "https";
import * as _request from "request-promise-native";
import {Log} from "../lib/logging/Log";
import * as fs from 'fs'
import * as mUrl from 'url'
import * as net from 'net'


import {JudgeRequest} from "./JudgeRequest";
import {DEFAULT_JUDGE_OPTIONS, IJudgeOptions} from "./IJudgeOptions";

import {JudgeResults} from "./JudgeResults";
import DomainUtils from "../utils/DomainUtils";
import {Utils} from "../utils/Utils";
import {MESSAGE, Messages} from "../lib/Messages";
import {ProtocolType} from "../lib/ProtocolType";
import Exceptions from "../exceptions/Exceptions";
import {Progress} from "../lib/Progress";

import {Runtime} from "../lib/Runtime";
import {CryptUtils} from "../utils/CryptUtils";


const FREEGEOIP: string = 'http://freegeoip.net/json/';
const IPCHECK_URL = 'https://api.ipify.org?format=json';


export class Judge {

    private inc: number = 0;
    private _options: IJudgeOptions = {};

    private secured: boolean = false;

    private server: net.Server = null;

    private _remote_url: mUrl.Url = null;

    private _judge_url: mUrl.Url = null;

    private enabled: boolean = false;
    private progress: Progress = new Progress();
    private runnable: boolean = false;
    private running: boolean = false;
    private cache_sum:number = 0
    private cache: { [key: string]: JudgeRequest } = {};

    private $connections: { [key: string]: net.Socket } = {};

    // private addr: Array<string> = []


    constructor(options: IJudgeOptions = {}) {
        this._options = Utils.merge(DEFAULT_JUDGE_OPTIONS, options);
        this._judge_url = mUrl.parse(this._options.judge_url);
        this._remote_url = mUrl.parse(this._options.remote_url);

        this.secured = this._judge_url.protocol === 'https:';

        if (this.secured || this._options.key_file || this._options.cert_file) {
            let has_ssl = false;
            if (!this._options.ssl_options) {
                this._options.ssl_options = {}
            } else {
                has_ssl = true
            }

            if (this._options.key_file) {
                this._options.ssl_options.key = fs.readFileSync(this._options.key_file);
                has_ssl = true
            }

            if (this._options.cert_file) {
                this._options.ssl_options.cert = fs.readFileSync(this._options.cert_file);
                has_ssl = true
            }

            /**
             * Adapt the secured flag and the protocol, if some ssl settings are present
             */
            if (has_ssl) {
                this.secured = true;
                this._judge_url.protocol = 'https:'
            }
        }


    }

    get ip(): string {
        return this._remote_url.hostname
    }

    get isSecured(): boolean {
        return this.secured;
    }

    get options(): IJudgeOptions {
        return this._options;
    }

    get remote_url(): mUrl.Url {
        return this._remote_url;
    }

    get remote_url_f(): string {
        return mUrl.format(this.remote_url)
    }

    get judge_url(): mUrl.Url {
        return this._judge_url
    }

    get judge_url_f(): string {
        return mUrl.format(this.judge_url)
    }

    async bootstrap(): Promise<boolean> {
        let infos :any = {
            ip:this.remote_url_f
        }

        try {
            if (this._options.remote_lookup) {
                this._remote_url = await this.get_remote_accessible_ip();
                infos.ip = this.remote_url_f
            }

            if (this._options.selftest) {
                await this.wakeup(true);
                this.runnable = await this.selftest();
                await this.pending();
            } else {
                this.runnable = true;
            }

            Runtime.$().setConfig('judge', {judge_url: this.judge_url_f, remote_url: this.remote_url_f});

            infos.runnable = this.runnable;
            infos.selftest = this._options.selftest;

            Log.info(Messages.get(MESSAGE.JDG02.k,infos));

            return Promise.resolve(this.runnable);
        } catch (err) {
            Log.error(err);
            throw err
        }
    }

    private async get_remote_accessible_ip(): Promise<any> {
        // If IP is fixed, it should be configurable ...
        try {
            let response_data = await _request.get(IPCHECK_URL);
            let json = JSON.parse(response_data);
            let remote_url = mUrl.parse(this._judge_url.protocol + '//' + json.ip + ':' + this._judge_url.port);
            return remote_url
        } catch (err) {
            Log.error(err);
            throw err
        }
    }

    /**
     *  Check if Judge
     */
    private async selftest(): Promise<boolean> {
        // Startup
        this.runnable = false;
        let ping_url = this.remote_url_f + 'ping';
        let start = new Date();
        try {
            let options: any = {};
            if (this.isSecured) {
                options.ca = this.options.ssl_options.cert
            }

            let res = await _request.get(ping_url, options);
            let s = JSON.parse(res);

            let stop = new Date();
            let c_s = s.time - start.getTime();
            let s_c = stop.getTime() - s.time;
            let full = stop.getTime() - start.getTime();

            this.info('Selftest results for request to '+ping_url+'\n' +
                ' - duration from client to judge service: ' + c_s + 'ms\n' +
                ' - duration from judge service to client: ' + s_c + 'ms\n' +
                ' - summarized: ' + full + 'ms');
            return true
        } catch (err) {
            return this.throwedError(err, false)
        }
    }


    createRequest(proxy_url: string, options: { local_ip?: string, socket_timeout?: number, connection_timeout?: number } = {}): JudgeRequest {
        let judge_url = this.remote_url_f;
        let inc = this.inc++;
        let req_id = CryptUtils.shorthash(judge_url + '-' + proxy_url + '-' + (new Date().getTime()) + '-' + inc);
        judge_url += 'judge/' + req_id;
        this.debug('judge: create request ' + req_id + ' over ' + proxy_url + ' (cached: '+this.cache_sum+')');
        let req_options = Object.assign(this.options.request, options);
        let judgeReq = new JudgeRequest(this, req_id, judge_url, proxy_url, req_options);
        return this.addToCache(judgeReq);
    }

    private addToCache(req: JudgeRequest): JudgeRequest {
        this.cache_sum++;
        this.cache[req.id] = req;
        return this.cache[req.id]
    }

    private removeFromCache(id: string) {
        if (this.cache[id]) {
            this.cache_sum--;
            delete this.cache[id]
        }
    }


    /**
     * Judge root callback
     *
     * @param req
     * @param res
     */
    public async judge(req: http.IncomingMessage, res: http.ServerResponse) {
        let _url: mUrl.Url = mUrl.parse(req.url)
        let paths = _url.path.split('/').filter((x) => {
            return x || x.length != 0;
        });
        let first_path = paths.shift();
        let cached_req: JudgeRequest = null;

        if (first_path === 'judge' && paths.length == 1) {
            let self = this;
            let req_id = paths.shift();

            if (this.cache[req_id]) {
                cached_req = this.cache[req_id];
                req.socket.once('end', function () {
                    self.removeFromCache(req_id);
                })
            }

            if (cached_req && this.enabled) {
                await cached_req.onJudge(req, res);
                res.writeHead(200, {"Content-Type": "application/json"});
                let json = JSON.stringify({time: (new Date()).getTime(), headers: req.headers});
                res.end(json);
            } else {
                Log.error('judge: no cache id for incoming request with ' + req_id + ' from '+req.url)
                res.writeHead(400, {"Content-Type": "application/json"});
                let json = JSON.stringify({'error': '400'});
                res.end(json);
            }

        } else if (first_path === 'ping') {
            res.writeHead(200, {"Content-Type": "application/json"});
            let json = JSON.stringify({time: (new Date()).getTime(), ping: true});
            res.end(json);
        } else {
            Log.error('judge: unknown request from '+req.url);
            res.writeHead(404, {"Content-Type": "application/json"});
            let json = JSON.stringify({'error': '404'});
            res.end(json);
        }

    }

    isEnabled() {
        return this.enabled;
    }

    private enable() {
        this.server.on('connection', this.onServerConnection.bind(this));
        this.enabled = true;
        this.info('Judge service startup on ' + this.judge_url_f + ' (SSL: ' + this.isSecured + ')');

    }

    private disable() {
        this.server = null;
        this.enabled = false;
        this.info('Judge service shutting down on ' + this.judge_url_f);

    }

    private setupTLS(server: net.Server) {
        /*
        server.on('newSession', this.onTLSNewSession.bind(this));
        server.on('OCSPRequest', this.onTLSOCSPRequest.bind(this));
        server.on('resumeSession', this.onTLSResumeSession.bind(this));
        server.on('secureConnection', this.onTLSSecureConnection.bind(this));
        server.on('tlsClientError', this.onTLSClientError.bind(this))
        */
    }

    /*
    private onTLSNewSession(sessionId: any, sessionData: any, callback: Function) {
        this.debug('onTLSNewSession');
        callback()
    }

    private onTLSOCSPRequest(certificate: Buffer, issuer: Buffer, callback: Function) {
        this.debug('onTLSOCSPRequest');
        callback(null, null)
    }

    private onTLSResumeSession(sessionId: any, callback: Function) {
        this.debug('onTLSResumeSession');
        callback()
    }

    private onTLSSecureConnection(tlsSocket: tls.TLSSocket) {
        this.debug('onTLSSecureConnection ' + (tlsSocket.authorized ? 'authorized' : 'unauthorized') + ' '
            + (tlsSocket.encrypted ? 'encrypted' : 'unencrypted'))

        //tlsSocket.resume()

    }

    private onTLSClientError(exception: Error, tlsSocket: tls.TLSSocket) {
        this.debug('onTLSClientError')
    }
*/

    async validate(ip: string, port: number, enable: { http: boolean, https: boolean } = {
        http: true,
        https: true
    }): Promise<JudgeResults> {
        let results: JudgeResults = new JudgeResults();
        results.host = ip;

        let domain = await DomainUtils.domainLookup(ip);
        ip = domain.addr;

        results.ip = ip;
        results.port = port;

        // Geo resolve
        results.geo = false;
        let geo_url = FREEGEOIP + ip;
        try {
            let geodata: string = await _request.get(geo_url);
            if (geodata) {
                results.geo = true;
                let geojson: { [k: string]: string } = JSON.parse(geodata);
                Object.keys(geojson).filter((k) => {
                    return ['ip'].indexOf(k) == -1
                }).forEach(k => {
                    results[k] = geojson[k]
                })
            }
        } catch (e) {
            Log.error(e)
        }

        if (enable.http) {
            let url = 'http://' + ip + ':' + port;
            let http_request: JudgeRequest = this.createRequest(url);
            await http_request.performRequest();
            results.http = http_request.result(ProtocolType.HTTP);
            this.removeFromCache(http_request.id);
            this.debug('judge: finished request ' + http_request.id + ' from ' + url + ' t='+results.http.duration+' error='+results.http.hasError()+' (cached: '+this.cache_sum+')');
        }

        if (enable.https) {
            let url = 'https://' + ip + ':' + port;
            let https_request: JudgeRequest = this.createRequest(url);
            await https_request.performRequest();
            results.https = https_request.result(ProtocolType.HTTPS);
            this.removeFromCache(https_request.id);
            this.debug('judge: finished request ' + https_request.id + ' from ' + url + ' t='+results.https.duration+' error='+results.https.hasError()+' (cached: '+this.cache_sum+')');
        }

        return Promise.resolve(results)
    }

    private onServerConnection(socket: net.Socket) {
        let self = this;

        function onData(data: Buffer) {
            let tmp: Buffer = Buffer.allocUnsafe(data.length);
            data.copy(tmp);

            let receivedHead = tmp.toString('utf8');
            if (/\r\n\r\n/.test(receivedHead)) {
                receivedHead = receivedHead.split("\r\n\r\n").shift()
            }

            let headers = receivedHead.split(/\r\n/);
            let head = headers[0].split(/\s+/);
            let method = head.shift();
            let path = head.shift();
            let paths = path.split('/').filter((x) => {
                return x || x.length != 0
            });

            let first_path = paths.shift();
            let cached_req: JudgeRequest = null;

            if (first_path === 'judge' && paths.length == 1) {
                let req_id = paths.shift();
                if (self.cache[req_id]) {
                    cached_req = self.cache[req_id]
                }

                if (cached_req && self.enabled) {
                    headers.forEach(function (head) {
                        cached_req.monitor.addLog(MESSAGE.HED01.k, {header: head ? head : '_UNKNOWN_'}, '>>')
                    })
                }
            }
        }

        socket.once('data', onData);

        // register connection
        let key = socket.remoteAddress + ':' + socket.remotePort;
        this.$connections[key] = socket;
        socket.once('close', function () {
            delete self.$connections[key];
        })
    }

    async progressing(): Promise<any> {
        return this.progress.waitTillDone()
    }

    async wakeup(force: boolean = false): Promise<boolean> {
        let self = this;

        // this.info('judge wakuping ...')

        await this.progress.startWhenReady();

        if (this.isEnabled()) {
            return Promise.resolve(true)
        }

        // TODO check if address and port are bound, on expcetion shutdown connection
        return new Promise<boolean>(function (resolve, reject) {
            try {
                if (self.runnable || (!self.runnable && force)) {
                    self.$connections = {};
                    if (self.isSecured) {
                        self.server = https.createServer(self.options.ssl_options, self.judge.bind(self));
                        self.setupTLS(self.server)
                    } else {
                        self.server = http.createServer(self.judge.bind(self))
                    }
                    self.server.on('error', (err) => {
                        let nErr = Exceptions.handle(err);
                        if (nErr.code === Exceptions.EADDRINUSE) {
                            reject(err)
                        } else {
                            Log.error('Judge server error:', err)
                        }
                    });
                    self.server.listen(parseInt(self._judge_url.port), self._judge_url.hostname, function () {
                        self.enable();
                        resolve(true)
                    })
                } else {
                    throw new Error('This will not work!')
                }
            } catch (e) {
                reject(e)
            }
        })
            .then(async r => {
                await self.progress.ready();
                return r
            })
    }


    async pending(): Promise<any> {
        let self = this;

        // this.info('judge pending ...')
        await this.progress.startWhenReady();

        if (!this.isEnabled()) {
            return Promise.resolve(true)
        }


        return new Promise(async function (resolve, reject) {
            try {
                if (self.server) {
                    self.server.removeAllListeners();

                    for (let conn in self.$connections) {
                        self.$connections[conn].destroy()
                    }

                    self.server.close(function () {
                        self.disable();
                        resolve(true)
                    });
                } else {
                    resolve(false)
                }
            } catch (e) {
                reject(e)
            }
        }).then(async r => {
            await self.progress.ready();
            return r
        })

    }

    private info(...msg: any[]) {
        Log.info.apply(Log, msg)
    }

    private throwedError(err: Error, ret?: any): any {
        Log.error(err);
        return ret;
    }

    private debug(...msg: any[]) {
        Log.debug.apply(Log, msg)

    }
}