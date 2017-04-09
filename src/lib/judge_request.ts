import * as util from 'util'
import * as http from "http";
import * as dns from "dns";
import * as mUrl from 'url'
import * as net from 'net'

import * as _request from "request-promise-native";
import {Log} from "./logging";
import {RequestResponseMonitor} from "./request_response_monitor";
import {shorthash} from "./crypt";
import {HttpHeaders} from "../d/http_headers";
import {Judge} from "./judge";

// interface JudgeConfig

const httpForwardHeader = ['forwarded-for', 'http-x-forwarded-for', 'x-forwarded-for', 'http-client-ip', 'x-client-ip', 'x-http-forwarded-for']
const httpViaHeader = ['via', 'http-via', 'proxy-connection', 'forwarded', 'http-forwarded']
const ignore_headers = ['host']

/*
 * TODO: Search in header data for domains which must be resolve to check them against proxy and local ip
 */
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
const IP_REGEX = /\d{0,3}\.\d{0,3}\.\d{0,3}\.\d{0,3}/


/*
 * TODO: Lookup IP Location
 *  - https://extreme-ip-lookup.com/json/63.70.164.200
 */

/*
 * L1 - elite - no forward and no proxy
 * L2 - anonymus - no forward, but proxy info
 * L3 - transparent - both ip and proxy
 * */

export class JudgeRequest {

    _debug: boolean = false
    private timeout: number = 10000

    private id: string
    private url: string
    private proxy_url: string
    private judge: Judge

    is_ip_present: string[] = []
    is_ip_of_proxy: string[] = []
    forward_headers: string[] = []
    via_headers: string[] = []
    level: number = -1

    response: any = null
    request: _request.RequestPromise = null
    monitor: RequestResponseMonitor = null

    judgeConnected: boolean = false
    judgeDate: Date = null

    headers_judge: HttpHeaders = {}

    local_ip: string = null
    local_regex:string = null
    proxy_ip: string = null
    proxy_regex:string = null
    // proxy_hostname:string = null

    constructor(judge: Judge, id: string, options: {url:string, local_ip?:string, proxy_url:string}) {
        this.judge = judge
        this.url = options.url
        this.id = id
        this.local_ip = options.local_ip || this.judge.ip
        this.proxy_url = options.proxy_url
        this.proxy_ip = mUrl.parse(this.proxy_url).hostname
    }

    private async _prepare(){
        this.local_regex = '('+this.local_ip+'(\\s|$|:))'
        let result = await this._lookup(this.local_ip)
        this.local_regex += '|(' + result.addr +'(\\s|$|:))'

        this.proxy_regex = '('+this.proxy_ip+'(\\s|$|:))'
        result = await this._lookup(this.proxy_ip)
        this.proxy_regex += '|(' + result.addr +'(\\s|$|:))'
    }

    private _lookup(domain:string):Promise<{addr:string,family:string}>{
        return new Promise(function(resolve, reject){
            dns.lookup(domain,function(err, address, family){
                if(err){
                    reject(err)
                }else{
                    resolve({addr:address, family:family})
                }
            })
        })
    }


    async performRequest(): Promise<any> {
        await this._prepare()

        let opts : _request.RequestPromiseOptions = {
            resolveWithFullResponse: true,
            proxy: this.proxy_url,
            timeout: this.timeout
        }

        if(this.judge.isSecured && this.judge.options.ssl_options.cert){
            opts.ca = this.judge.options.ssl_options.cert
        }

        this.request = _request.get(this.url, opts)
        this.monitor = RequestResponseMonitor.monitor(this.request, this.id, {debug: this._debug})
        try {
            this.response = await this.request.promise()
        } catch (err) {
            // TODO How to handle request errors?
            throw err
        }
        return this.monitor.promise()
    }

    get duration() {
        return this.monitor.duration
    }




    onJudge(req: http.IncomingMessage, res: http.ServerResponse) {
        this.judgeConnected = true
        this.judgeDate = new Date()

        this.monitor.stop()
        this.monitor.addLog(`Judge connected. (${this.monitor.duration}ms)`, '*')

        let rx_ip = new RegExp((this.local_regex).replace('.', '\\.'))
        let rx_proxy_ip = new RegExp(this.proxy_regex.replace('.', '\\.'))
        let keys = Object.keys(req.headers)

        keys = keys.filter((x) => {
            return ignore_headers.indexOf(x) == -1
        })

        for (let k of keys) {
            let entry = req.headers[k]
            this.debug('header=>',k,entry)

            /*
             * TODO Resolve domain names if present!
             */
            this.headers_judge[k] = entry
            if (rx_ip.test(entry)) {
                this.is_ip_present.push(k)
            }

            if (rx_proxy_ip.test(entry)) {
                this.is_ip_of_proxy.push(k)
            }

            if (httpForwardHeader.indexOf(k) > -1) {
                this.forward_headers.push(k)
            }

            if (httpViaHeader.indexOf(k) > -1) {
                this.via_headers.push(k)
            }
        }

        if (this.is_ip_of_proxy.length == 0 && this.is_ip_present.length == 0) {
            this.monitor.addLog(`Proxy is L1 - elite (high anonymus):`, '*')
            this.level = 1

        } else if (this.is_ip_of_proxy.length > 0 && this.is_ip_present.length == 0) {
            this.monitor.addLog(`Proxy is L2 - anonymus:`, '*')
            //} else if(is_ip_of_proxy.length == 0 && is_ip_present.length > 0){
            //    this.monitor.addLog(`Proxy is L3 - :`, '*')
            this.level = 2
        } else {
            this.monitor.addLog(`Proxy is L3 - transparent:`, '*')
            this.level = 3
        }

        if (this.is_ip_present.length > 0) {
            this.monitor.addLog(`- IP in headers: ${this.is_ip_present.join(', ')}`, '*')
        }

        if (this.is_ip_of_proxy.length > 0) {
            this.monitor.addLog(`- IP of proxy in headers: ${this.is_ip_of_proxy.join(', ')}`, '*')
        }

        if (this.via_headers.length > 0) {
            this.monitor.addLog(`- HTTP "via" headers used: ${this.via_headers.join(', ')}`, '*')
        }

        if (this.forward_headers.length > 0) {
            this.monitor.addLog(`- HTTP "forward" headers used: ${this.forward_headers.join(', ')}`, '*')
        }
    }

    private info(...msg: any[]) {
        Log.info.apply(Log, msg)
    }

    private debug(...msg: any[]) {
        if (this._debug) {
            Log.debug.apply(Log, msg)
        }
    }

    private throwedError(err: Error, ret?: any): any {
        Log.error(err)
        return ret
    }
}
