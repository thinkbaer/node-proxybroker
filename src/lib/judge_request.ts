import * as http from "http";
import * as _request from "request-promise-native";
import {Log} from "./logging";

import * as util from 'util'
import * as mUrl from 'url'
import * as net from 'net'
import {RequestResponseMonitor} from "./request_response_monitor";
import {shorthash} from "./crypt";
import {HttpHeaders} from "../d/http_headers";
import {Judge} from "./judge";


// interface JudgeConfig

const httpForwardHeader = ['forwarded-for', 'http-x-forwarded-for', 'x-forwarded-for', 'http-client-ip', 'x-client-ip', 'x-http-forwarded-for']
const httpViaHeader = ['via', 'http-via', 'proxy-connection', 'forwarded', 'http-forwarded']
const ignore_headers = ['host']
/*
 * L1 - no forward and no proxy
 * L2 - no forward
 * L3 - transparent
 * */

export class JudgeRequest {

    private id: string
    private url: string
    private proxy_url: string
    private judge: Judge


    response: any = null
    request: _request.RequestPromise = null
    monitor: RequestResponseMonitor = null

    judgeConnected: boolean = false
    judgeDate: Date = null

    headers_judge: HttpHeaders = {}

    local_ip: string = null
    //local_hostname:string = null
    proxy_ip: string = null
    // proxy_hostname:string = null


    constructor(judge: Judge, id: string, url: string, proxy_url: string) {
        this.judge = judge
        this.url = url
        this.id = id
        this.local_ip = this.judge.ip
        this.proxy_url = proxy_url
        this.proxy_ip = mUrl.parse(proxy_url).hostname

        if (!this.proxy_ip.match('\d+\.\d+\.\d+\.\d+')) {
            // TODO Throw Exception? or resolve per DNS!
        }

    }


    async performRequest(): Promise<any> {
        this.request = _request.get(this.url, {
            resolveWithFullResponse: true,
            proxy: this.proxy_url,
            timeout: 10000
        })
        this.monitor = RequestResponseMonitor.monitor(this.request, this.id)
        this.response = await this.request.promise()
        return this.monitor.promise()
    }


    onJudge(req: http.IncomingMessage, res: http.ServerResponse) {
        //this.monitor.judgeConnected = true
        this.judgeDate = new Date()


        this.monitor.stop()
        this.monitor.addLog(`Judge connected. (${this.monitor.duration}ms)`, '*')

        let rx_ip = new RegExp((this.local_ip).replace('.', '\\.'))
        let rx_proxy_ip = new RegExp(this.proxy_ip.replace('.', '\\.'))
        let keys = Object.keys(req.headers)

        keys = keys.filter((x) => {
            return ignore_headers.indexOf(x) == -1
        })

        let is_ip_present = []
        let is_ip_of_proxy = []
        let forward_headers = []
        let via_headers = []


        for (let k of keys) {
            let entry = req.headers[k]
            console.log(entry)
            /*
             * TODO Resolve domain names if present!
             */
            this.headers_judge[k] = entry
            if (rx_ip.exec(entry)) {
                is_ip_present.push(k)
            }

            if (rx_proxy_ip.exec(entry)) {
                is_ip_of_proxy.push(k)
            }

            if (httpForwardHeader.indexOf(k) > -1) {
                forward_headers.push(k)
            }

            if (httpViaHeader.indexOf(k) > -1) {
                via_headers.push(k)
            }
        }

        if (is_ip_of_proxy.length == 0 && is_ip_present.length == 0) {
            this.monitor.addLog(`Proxy is L1 - elite (high anonymus):`, '*')

        } else if (is_ip_of_proxy.length > 0 && is_ip_present.length == 0) {
            this.monitor.addLog(`Proxy is L2 - anonymus:`, '*')
            //} else if(is_ip_of_proxy.length == 0 && is_ip_present.length > 0){
            //    this.monitor.addLog(`Proxy is L3 - :`, '*')
        }else{
            this.monitor.addLog(`Proxy is L3 - transparent:`, '*')
        }

        if (is_ip_present.length > 0) {
            this.monitor.addLog(`- IP in headers: ${is_ip_present.join(', ')}`, '*')
        }

        if (is_ip_of_proxy.length > 0) {
            this.monitor.addLog(`- IP of proxy in headers: ${is_ip_of_proxy.join(', ')}`, '*')
        }
        if (via_headers.length > 0) {
            this.monitor.addLog(`- HTTP "via" headers used: ${via_headers.join(', ')}`, '*')
        }
        if (forward_headers.length > 0) {
            this.monitor.addLog(`- HTTP "forward" headers used: ${forward_headers.join(', ')}`, '*')
        }
    }

}
