import * as http from "http";
import * as tls from "tls";
import * as https from "https";
import * as _request from "request-promise-native";
import {Log} from "../logging/logging";
import * as fs from 'fs'
import * as mUrl from 'url'
import * as net from 'net'
import {RequestResponseMonitor} from "./RequestResponseMonitor";
import {shorthash} from "../lib/crypt";
import {format} from "util"

import {JudgeRequest} from "./JudgeRequest";
import {IJudgeOptions} from "./IJudgeOptions";
import {merge} from "typescript-object-utils";
import {JudgeResults} from "./JudgeResults";
import {domainLookup} from "../utils/Domain";


const FREEGEOIP: string = 'http://freegeoip.net/json/%s'
const IPCHECK_URL = 'https://api.ipify.org?format=json'


const defaultOptions: IJudgeOptions = {
    selftest: true,
    remote_lookup: true,
    debug: false,
    remote_url: 'http://127.0.0.1:8080',
    judge_url: 'http://0.0.0.0:8080',
    request: {timeout: 5000}
}


export class Judge {

    private inc: number = 0
    private _options: IJudgeOptions = Judge.default_options()

    private secured: boolean = false

    private server: net.Server = null

    private _remote_url: mUrl.Url = null
    private _judge_url: mUrl.Url = null

    private enabled: boolean = false
    private runnable: boolean = false
    private running: boolean = false

    private cache: { [key: string]: JudgeRequest } = {}

    // private addr: Array<string> = []


    constructor(options: IJudgeOptions = {}) {
        this._options = merge(this._options, options)
        this._judge_url = mUrl.parse(this._options.judge_url)
        this._remote_url = mUrl.parse(this._options.remote_url)


        /*
         let self = this
         // @see http://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
         let ifaces = os.networkInterfaces();
         Object.keys(ifaces).forEach(function (ifname:string) {
         ifaces[ifname].forEach(function (iface) {
         self.addr.push(iface.address);
         });
         });
         */

        this.secured = this._judge_url.protocol === 'https:'

        if (this.secured || this._options.key_file || this._options.cert_file) {
            let has_ssl = false
            if (!this._options.ssl_options) {
                this._options.ssl_options = {}
            } else {
                has_ssl = true
            }

            if (this._options.key_file) {
                this._options.ssl_options.key = fs.readFileSync(this._options.key_file)
                has_ssl = true
            }

            if (this._options.cert_file) {
                this._options.ssl_options.cert = fs.readFileSync(this._options.cert_file)
                has_ssl = true
            }

            /**
             * Adapt the secured flag and the protocol, if some ssl settings are present
             */
            if (has_ssl) {
                this.secured = true
                this._judge_url.protocol = 'https:'
            }
        }
    }

    get ip(): string {
        return this._remote_url.hostname
    }

    get isSecured(): boolean {
        return this.secured
    }

    get options(): IJudgeOptions {
        return this._options
    }

    get remote_url(): mUrl.Url {
        return this._remote_url
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

    static default_options() {
        return Object.assign({}, defaultOptions)
    }

    async bootstrap(): Promise<boolean> {
        try {
            if (this._options.remote_lookup) {
                Log.info('The remote IP before: ' + this.remote_url_f)
                this._remote_url = await this.get_remote_accessible_ip()
                Log.info('The remote IP after: ' + this.remote_url_f)
            }
            if (this._options.selftest) {
                await this.wakeup(true)
                this.runnable = await this.selftest()
                await this.pending()
            } else {
                this.runnable = true
            }
            return this.runnable
        } catch (err) {
            Log.error(err)
            throw err
        }
    }

    private async get_remote_accessible_ip(): Promise<any> {
        // If IP is fixed, it should be configurable ...
        try {
            let response_data = await _request.get(IPCHECK_URL)
            let json = JSON.parse(response_data)
            let remote_url = mUrl.parse(this._judge_url.protocol + '//' + json.ip + ':' + this._judge_url.port)
            return remote_url
        } catch (err) {
            Log.error(err)
            throw err
        }
    }

    /**
     *  Check if Judge
     */
    private async selftest(): Promise<boolean> {
        // Startup
        this.runnable = false
        let ping_url = this.remote_url_f + 'ping'
        let start = new Date()
        try {
            let options: any = {}
            if (this.isSecured) {
                options.ca = this.options.ssl_options.cert
            }
            let res = await _request.get(ping_url, options)
            var s = JSON.parse(res)
            var stop = new Date()
            var c_s = s.time - start.getTime()
            var s_c = stop.getTime() - s.time
            var full = stop.getTime() - start.getTime()
            this.debug('Self Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full + ' on ' + ping_url)
            return true
        } catch (err) {
            return this.throwedError(err, false)

            // return false
        }
    }


    createRequest(proxy_url: string, options: { local_ip?: string, timeout?: number } = {}): JudgeRequest {
        let judge_url = this.remote_url_f
        let inc = this.inc++
        let req_id = shorthash(judge_url + '-' + proxy_url + '-' + (new Date().getTime()) + '-' + inc)
        judge_url += 'judge/' + req_id
        this.debug('JUDGE_URL', judge_url)
        let req_options = Object.assign(this.options.request, options)
        let judgeReq = new JudgeRequest(this, req_id, judge_url, proxy_url, req_options)
        this.cache[req_id] = judgeReq
        return this.cache[req_id]
    }


    /**
     * Judge root callback
     *
     * @param req
     * @param res
     */
    public judge(req: http.IncomingMessage, res: http.ServerResponse) {
        let paths = req.url.split('/').filter((x) => {
            return x || x.length != 0
        })
        this.debug('paths=' + JSON.stringify(paths))

        let first_path = paths.shift()
        let cached_req: JudgeRequest = null

        if (first_path === 'judge' && paths.length == 1) {
            let self = this
            let req_id = paths.shift()
            this.debug('JUDGE_ID: ' + req_id)

            if (this.cache[req_id]) {
                cached_req = this.cache[req_id]
                req.socket.once('end', function () {
                    self.debug('CLEANUPO')
                    delete self.cache[req_id]
                })

            }

            if (cached_req && this.enabled) {
                cached_req.onJudge(req, res)
                res.writeHead(200, {"Content-Type": "application/json"});
                var json = JSON.stringify({time: (new Date()).getTime(), headers: req.headers});
                res.end(json);
            } else {
                res.writeHead(400, {"Content-Type": "application/json"});
                var json = JSON.stringify({'error': '400'});
                res.end(json);
            }

        } else if (first_path === 'ping') {
            res.writeHead(200, {"Content-Type": "application/json"});
            var json = JSON.stringify({time: (new Date()).getTime(), ping: true});
            res.end(json);
        } else {
            res.writeHead(404, {"Content-Type": "application/json"});
            var json = JSON.stringify({'error': '404'});
            res.end(json);
        }

    }


    enable() {
        this.enabled = true
    }

    disable() {
        this.enabled = false
    }

    private setupTLS(server: net.Server) {
        server.on('newSession', this.onTLSNewSession.bind(this))
        server.on('OCSPRequest', this.onTLSOCSPRequest.bind(this))
        server.on('resumeSession', this.onTLSResumeSession.bind(this))
        server.on('secureConnection', this.onTLSSecureConnection.bind(this))
        server.on('tlsClientError', this.onTLSClientError.bind(this))
    }

    private onTLSNewSession(sessionId: any, sessionData: any, callback: Function) {
        this.debug('onTLSNewSession')
        callback()
    }

    private onTLSOCSPRequest(certificate: Buffer, issuer: Buffer, callback: Function) {
        this.debug('onTLSOCSPRequest')
        callback(null, null)
    }

    private onTLSResumeSession(sessionId: any, callback: Function) {
        this.debug('onTLSResumeSession')
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


    async validate(ip: string, port: number): Promise<JudgeResults> {
        let results: JudgeResults = new JudgeResults()
        results.host = ip

        let domain = await domainLookup(ip)
        ip = domain.addr

        results.ip = ip
        results.port = port

        // Geo resolve
        results.geo=false
        let geo_url = format(FREEGEOIP, ip)
        try {
            let geodata: string = await _request.get(geo_url)
            if (geodata) {
                results.geo=true
                let geojson: { [k: string]: string } = JSON.parse(geodata)

                Object.keys(geojson).filter((k) => {
                    return ['ip'].indexOf(k) == -1
                }).forEach(k => {
                    results[k] = geojson[k]
                })
            }
        } catch (e) {
            Log.error(e)
        }


        let http_request: JudgeRequest = this.createRequest('http://' + ip + ':' + port)
        //let http_monitor: RequestResponseMonitor =
        await http_request.performRequest()
        results.http = http_request.result()

        let https_request: JudgeRequest = this.createRequest('https://' + ip + ':' + port)
        //let https_monitor: RequestResponseMonitor =
        await https_request.performRequest()
        results.https = https_request.result()

        return Promise.resolve(results)
    }


    // /**
    //  * Test HTTP, HTTPS, ANONYMITY LEVEL
    //  *
    //  * TODO this is not ready
    //  *
    //  * @param proxy
    //  */
    // async runTests(proxy: mUrl.Url): Promise<any> {
    //     let start = new Date()
    //     let report: any = {}
    //     let self = this
    //     let http_url = mUrl.format(proxy)
    //
    //     try {
    //         let request = _request.defaults({proxy: http_url, timeout: 10000})
    //
    //         let requestPromise = request.get(mUrl.format(self._remote_url), {resolveWithFullResponse: true})
    //         let rrm = RequestResponseMonitor.monitor(requestPromise)
    //         let response = await requestPromise
    //         await rrm.promise()
    //
    //         console.log(rrm.logToString())
    //
    //         var s = JSON.parse(response.body)
    //         var stop = new Date()
    //         var c_s = s.time - start.getTime()
    //         var s_c = stop.getTime() - s.time
    //         var full = stop.getTime() - start.getTime()
    //
    //         console.log('Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full);
    //         report['http'] = {
    //             start: start,
    //             stop: stop,
    //             duration: full,
    //             success: true,
    //             log: ''
    //         }
    //
    //     } catch (err) {
    //
    //         var stop = new Date()
    //         var full = stop.getTime() - start.getTime()
    //         report['http'] = {
    //             start: start,
    //             stop: stop,
    //             duration: full,
    //             success: false,
    //             log: ''
    //         }
    //         self.throwedError(err)
    //     }
    //     return report
    // }


    wakeup(force: boolean = false): Promise<any> {
        let self = this
        return new Promise(function (resolve, reject) {
            try {
                if (self.runnable || (!self.runnable && force)) {

                    if (self.isSecured) {
                        self.server = https.createServer(self.options.ssl_options, self.judge.bind(self))
                        self.setupTLS(self.server)
                    } else {
                        self.server = http.createServer(self.judge.bind(self))
                    }
                    self.server.on('connection', self.onServerConnection.bind(self))
                    self.server.listen(parseInt(self._judge_url.port), self._judge_url.hostname, function () {
                        self.enable()
                        self.info('Judge service startup on ' + self.judge_url_f + ' (SSL: ' + self.isSecured + ')')
                        resolve(true)
                    })
                } else {
                    throw new Error('This will not work!')
                }
            } catch (e) {
                reject(e)
            }
        })
    }

    private onServerConnection(socket: net.Socket) {

        let self = this

        function onData(data: Buffer) {
            let tmp: Buffer = Buffer.allocUnsafe(data.length)
            data.copy(tmp)

            let receivedHead = tmp.toString('utf8')
            if (/\r\n\r\n/.test(receivedHead)) {
                receivedHead = receivedHead.split("\r\n\r\n").shift()
            }


            let headers = receivedHead.split(/\r\n/)
            let head = headers[0].split(/\s+/)
            let method = head.shift()
            let path = head.shift()
            let paths = path.split('/').filter((x) => {
                return x || x.length != 0
            })

            let first_path = paths.shift()
            let cached_req: JudgeRequest = null

            if (first_path === 'judge' && paths.length == 1) {
                let req_id = paths.shift()
                self.debug('JUDGE_REQ_ID: ' + req_id)

                if (self.cache[req_id]) {
                    self.debug('JUDGE_REQ_ID FOUND: ' + req_id)
                    cached_req = self.cache[req_id]
                }

                if (cached_req && self.enabled) {
                    self.debug('HEADER ADD: ', headers)
                    headers.forEach(function (head) {
                        cached_req.monitor.addLog(head, '>>')
                    })
                }
            }
        }

        socket.once('data', onData)
    }


    pending(): Promise<any> {
        let self = this
        return new Promise(function (resolve, reject) {
            try {
                if (self.server) {
                    self.server.close(function () {
                        self.disable()
                        self.info('Judge service shutting down on ' + self.judge_url_f)
                        resolve(true)
                    })
                } else {
                    resolve(false)
                }
            } catch (e) {
                reject(e)
            }
        })

    }

    private info(...msg: any[]) {
        Log.info.apply(Log, msg)
    }

    private throwedError(err: Error, ret?: any): any {
        Log.error(err)
        return ret
    }

    private debug(...msg: any[]) {
        if (this._options.debug) {
            Log.debug.apply(Log, msg)
        }

    }
}