import * as _ from 'lodash'


import DomainUtils from "../utils/DomainUtils";
import {Utils} from "../utils/Utils";
import {IHeader} from "./IHeader";

const httpForwardHeader = ['forwarded-for', 'http-x-forwarded-for', 'x-forwarded-for', 'http-client-ip', 'x-client-ip', 'x-http-forwarded-for']
const httpViaHeader = ['via', 'http-via', 'proxy-connection', 'forwarded', 'http-forwarded']
const ignore_headers = ['host']



export class LevelDetection {

    static DEFAULT_LEVEL: number = -1


    local_ip: string = null
    proxy_ip: string = null

    local_regex: RegExp = null
    proxy_regex: RegExp = null

    local_regex_str: string = null
    proxy_regex_str: string = null

    stats: {
        hasLocalIp: number,
        hasProxyIp: number,
        isVia: number,
        isForward: number
    } = {
        hasLocalIp: 0,
        hasProxyIp: 0,
        isVia: 0,
        isForward: 0

    }

    private recv_headers: IHeader[] = []

    private _level: number = null

    constructor(proxy_ip: string, ip: string) {
        this._level = LevelDetection.DEFAULT_LEVEL
        this.proxy_ip = proxy_ip
        this.local_ip = ip
    }

    get level() {
        return this._level
    }

    get headers(): IHeader[] {
        return this.recv_headers
    }


    addRecvHeader(headers: any) {
        let keys = Object.keys(headers).filter((x) => {
            return ignore_headers.indexOf(x) == -1
        })

        for (let k of keys) {
            this.recv_headers.push({
                key: k,
                value: headers[k],
                hasLocalIp: false,
                hasProxyIp: false,
                isForward: false,
                isVia: false,
                ip: null,
                host: null
            })
        }
    }

    private static async createAddrRegex(ip: string): Promise<string> {
        let l: string[] = []
        l.push('(' + Utils.escapeRegExp(ip) + '(\\s|$|:))')
        let result = await DomainUtils.domainLookup(ip)
        if (result && result.addr !== ip) {
            l.push('(' + Utils.escapeRegExp(result.addr) + '(\\s|$|:))')
        }

        if (result && result.addr) {
            let hosts = await DomainUtils.reverse(result.addr)
            hosts.forEach(_x => {
                l.push('(' + Utils.escapeRegExp(_x) + '(\\s|$|:))')
            })

        }
        return Promise.resolve(l.join('|'))

    }

    async prepare(): Promise<void> {
        this.local_regex_str = await LevelDetection.createAddrRegex(this.local_ip)
        this.proxy_regex_str = await LevelDetection.createAddrRegex(this.proxy_ip)

        this.local_regex = new RegExp(this.local_regex_str, 'gi')
        this.proxy_regex = new RegExp(this.proxy_regex_str, 'gi')
        return Promise.resolve()
    }


    async detect(): Promise<void> {
        let self = this
        for (let header of this.recv_headers) {

            let key = header.key
            let value = header.value

            if (this.local_regex.test(value)) {
                // this.is_ip_present.push(k)
                header.hasLocalIp = true
            }

            if (this.proxy_regex.test(value)) {
                header.hasProxyIp = true
            }

            if (httpForwardHeader.indexOf(key.toLocaleLowerCase()) > -1) {
                header.isForward = true
            }

            if (httpViaHeader.indexOf(key.toLocaleLowerCase()) > -1) {
                header.isVia = true
            }

            Object.keys(header).forEach(_k => {
                if (header[_k] === true) {
                    self.stats[_k]++
                }
            })
        }


        if (!this.hasLocalIP() && !this.hasProxyIP() && !this.hasViaHeader() && !this.hasForwardHeader()) {
            // Elite
            this._level = 1
        } else if (!this.hasLocalIP() && !this.hasForwardHeader()) {
            // Anonym
            this._level = 2
        } else {
            // Transparent
            this._level = 3
        }

        /*
         if (this.is_ip_of_proxy.length == 0 && this.is_ip_present.length == 0) {

         this.level = 1

         } else if (this.is_ip_of_proxy.length > 0 && this.is_ip_present.length == 0) {

         //} else if(is_ip_of_proxy.length == 0 && is_ip_present.length > 0){
         //    this.monitor.addLog(`Proxy is L3 - :`, '*')
         this.level = 2
         } else {

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
         */
        return Promise.resolve()
    }

    hasForwardHeader(): boolean {
        return this.stats.isForward > 0
    }

    hasViaHeader(): boolean {
        return this.stats.isVia > 0
    }

    hasProxyIP(): boolean {
        return this.stats.hasProxyIp > 0
    }

    hasLocalIP(): boolean {
        return this.stats.hasLocalIp > 0
    }

    findAll(d: any): any[] {
        return _.filter(this.recv_headers, d)
    }

}
