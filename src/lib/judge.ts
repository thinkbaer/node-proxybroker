import * as http from "http";
import * as _request from "request-promise-native";
import {Log} from "./logging";

import * as mUrl from 'url'
import * as net from 'net'
import {RequestResponseMonitor} from "./request_response_monitor";
import {shorthash} from "./crypt";

import {JudgeRequest} from "./judge_request";


// interface JudgeConfig


const IPCHECK_URL = 'https://api.ipify.org?format=json'

export interface JudgeOptions {
    selftest?: boolean
    remote_lookup?: boolean
    remote_url?: string
    judge_url?: string
    cert_file?: string
    cert?: string
    key_file?: string
    key?: string
}


const defaultOptions: JudgeOptions = {
    selftest: true,
    remote_lookup: true,
    remote_url: 'http://127.0.0.1:8080',
    judge_url: 'http://127.0.0.1:8080'
}




export class Judge {

    _debug:boolean = false

    private inc: number = 0
    private options: JudgeOptions = defaultOptions

    private server: net.Server = null

    private _remote_url: mUrl.Url = null
    private _judge_url: mUrl.Url = null

    private enabled: boolean = false
    private runnable: boolean = false
    private running: boolean = false

    private cache: {[key: string]: JudgeRequest} = {}


    constructor(options: JudgeOptions = {}) {
        this.options = Object.assign(this.options, options)
        this._remote_url = mUrl.parse(this.options.remote_url)
        this._judge_url = mUrl.parse(this.options.judge_url)

    }

    get ip(): string {
        return this._remote_url.hostname
    }


    get remote_url(): mUrl.Url {
        return this._remote_url
    }

    async bootstrap(): Promise<boolean> {
        let self = this

        try {
            if (this.options.remote_lookup) {
                await this.get_remote_accessible_ip()
            }
            if (this.options.selftest) {
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
            this._remote_url = mUrl.parse(this._remote_url.protocol + '//' + json.ip + ':' + this._remote_url.port)
            Log.info('The accessible remote IP: ' + mUrl.format(this._remote_url))
            return this._remote_url
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
        let self = this
        self.runnable = false
        let start = new Date()
        return _request.get(mUrl.format(self._remote_url))
            .then((r) => {
                var s = JSON.parse(r)
                var stop = new Date()
                var c_s = s.time - start.getTime()
                var s_c = stop.getTime() - s.time
                var full = stop.getTime() - start.getTime()
                Log.log('Self Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full + ' on ' + mUrl.format(self._remote_url))
                return true
            })
            .catch(err => {
                Log.error(err)
                return false
            })
    }


    createRequest(proxy_url: string): JudgeRequest {
        let judge_url = mUrl.format(this.remote_url)
        let inc = this.inc++
        let req_id = shorthash(judge_url + '-' + proxy_url + '-' + (new Date().getTime()) + '-' + inc)
        judge_url += 'judge/' + req_id
        this.debug('JUDGE_URL', judge_url)
        let judgeReq = new JudgeRequest(this, req_id, judge_url, proxy_url)
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

        let cached_req: JudgeRequest = null
        if (paths.shift() === 'judge' && paths.length == 1) {
            let req_id = paths.shift()
            this.debug('JUDGE_ID: ' + req_id)

            if (this.cache[req_id]) {
                cached_req = this.cache[req_id]
                delete this.cache[req_id]
            }
        }


        if (cached_req && this.enabled) {
            cached_req.onJudge(req, res)
            res.writeHead(200, {"Content-Type": "application/json"});
            var json = JSON.stringify({time: (new Date()).getTime(), headers: req.headers});
            res.end(json);
        } else {
            this.debug('deliver error')
            res.writeHead(404, {"Content-Type": "application/json"});
            var json = JSON.stringify({'404': 'Error'});
            res.end(json);
        }
    }


    enable() {
        this.enabled = true
    }

    disable() {
        this.enabled = false
    }


    /**
     * Test HTTP, HTTPS, ANONYMITY LEVEL
     *
     * @param proxy
     */
    async runTests(proxy: mUrl.Url): Promise < any > {
        let start = new Date()
        let report: any = {}
        let self = this

        try {
            let http_url = mUrl.format(proxy)
            let r = _request.defaults({proxy: http_url, timeout: 10000})

            let requestPromise = r.get(mUrl.format(self._remote_url), {resolveWithFullResponse: true})
            let rrm = RequestResponseMonitor.monitor(requestPromise)
            let response = await requestPromise
            await rrm.promise()

            console.log(rrm.logToString())

            var s = JSON.parse(response.body)
            var stop = new Date()
            var c_s = s.time - start.getTime()
            var s_c = stop.getTime() - s.time
            var full = stop.getTime() - start.getTime()

            console.log('Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full);
            report['http'] = {
                start: start,
                stop: stop,
                duration: full,
                success: true,
                log: ''
            }

        } catch (err) {
            Log.error(err)
            var stop = new Date()
            var full = stop.getTime() - start.getTime()
            report['http'] = {
                start: start,
                stop: stop,
                duration: full,
                success: false,
                log: ''
            }
        }
        return report
    }

    wakeup(force: boolean = false): Promise < any > {
        let self = this
        return new Promise(function (resolve, reject) {
            try {
                if (self.runnable || (!self.runnable && force)) {
                    self.server = http.createServer(self.judge.bind(self))
                    self.server.listen(parseInt(self._judge_url.port), self._judge_url.hostname, function () {
                        self.enable()

                        self.info('Judge service startup on ' + mUrl.format(self._judge_url))
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


    pending(): Promise < any > {
        let self = this
        return new Promise(function (resolve, reject) {
            try {
                if (self.server) {
                    self.server.close(function () {
                        self.disable()
                        self.info('Judge service shutting down on ' + mUrl.format(self._judge_url))
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

    private debug(...msg: any[]) {
        if(this._debug){
            Log.debug.apply(Log, msg)
        }

    }
}