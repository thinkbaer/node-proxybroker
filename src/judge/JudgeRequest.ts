
import * as http from "http";

import * as mUrl from 'url'
import * as net from 'net'

import * as _request from "request-promise-native";
import {Log} from "../lib/logging/Log";
import {RequestResponseMonitor} from "./RequestResponseMonitor";

import {IHttpHeaders} from "../lib/IHttpHeaders";
import {Judge} from "./Judge";
import {IJudgeRequestOptions} from "./IJudgeRequestOptions";


import Timer = NodeJS.Timer;
import {LevelDetection} from "./LevelDetection";
import {MESSAGE} from "../lib/Messages";
import {JudgeResult} from "./JudgeResult";
import {ProtocolType} from "../lib/ProtocolType";


// interface JudgeConfig


/*
 * TODO: Search in header data for domains which must be resolve to check them against proxy and local ip
 */
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
const IP_REGEX = /\d{0,3}\.\d{0,3}\.\d{0,3}\.\d{0,3}/;


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

    _debug: boolean = false;
    private connect_timeout: number = 2000;
    private socket_timeout: number = 10000;

    readonly id: string;
    private url: string;
    private proxy_url: string;

    local_ip: string = null;
    proxy_ip: string = null;

    private judge: Judge;

    private level_detector: LevelDetection = null;

    response: any = null;
    request: _request.RequestPromise = null;
    monitor: RequestResponseMonitor = null;

    judgeConnected: boolean = false;
    judgeDate: Date = null;

    headers_judge: IHttpHeaders = {};
    timer: Timer = null;
    socket : net.Socket = null;
    // proxy_hostname:string = null


    constructor(judge: Judge, id: string, url: string, proxy_url: string, options?: IJudgeRequestOptions) {
        this.judge = judge;
        this.url = url;
        this.id = id;

        this.proxy_url = proxy_url;
        this.connect_timeout = options.connection_timeout || this.connect_timeout;
        this.socket_timeout = options.socket_timeout || this.socket_timeout;
        this.local_ip = options.local_ip || this.judge.ip;
        this.proxy_ip = mUrl.parse(this.proxy_url).hostname
    }


    async performRequest(): Promise<RequestResponseMonitor> {

        this.level_detector = new LevelDetection(this.proxy_ip, this.local_ip);
        await this.level_detector.prepare();

        let opts: _request.RequestPromiseOptions = {
            resolveWithFullResponse: true,
            proxy: this.proxy_url,
            timeout: this.connect_timeout,
            forever: false
        };

        if (this.judge.isSecured && this.judge.options.ssl_options.cert) {
            opts.ca = this.judge.options.ssl_options.cert
        }

        this.request = _request.get(this.url, opts);
        this.request.on('socket', this.onSocket.bind(this));

        this.monitor = RequestResponseMonitor.monitor(this.request, this.id, {debug: this._debug});
        try {
            this.response = await this.request.promise()
        } catch (e) {
            // Will be also in ReqResMonitor
        }
        return this.monitor.promise()
    }


    private onSocket(socket: net.Socket) {
        this.debug('JR onSocket');
        this.socket = socket;
        socket.setKeepAlive(false);
        socket.setTimeout(this.socket_timeout);
        socket.on('error', this.onSocketError.bind(this))
    }

    private onSocketError(error: Error) {
        this.debug('JR onSocketError');
        if(this.socket){
            this.socket.destroy()
        }
    }


    get duration() {
        return this.monitor.duration
    }


    async onJudge(req: http.IncomingMessage, res: http.ServerResponse):Promise<void> {
        this.judgeConnected = true;
        this.judgeDate = new Date();

        this.monitor.stop();
        this.monitor.addLog(MESSAGE.JDG01.k,{addr:req.socket.remoteAddress,port:req.socket.remotePort,duration:this.monitor.duration}, '*');
        this.level_detector.addRecvHeader(req.headers);
        await this.level_detector.detect();

        switch(this.level_detector.level){
            case 1:
                this.monitor.addLog(MESSAGE.PRX01.k,{level:1}, '*');
                break;
            case 2:
                this.monitor.addLog(MESSAGE.PRX02.k,{level:2}, '*');
                break;
            case 3:
                this.monitor.addLog(MESSAGE.PRX03.k,{level:3}, '*');
                break;
            default:
                this.monitor.addLog(MESSAGE.PRX10.k,{level:null}, '*');
                break;
        }


        this.level_detector.headers.forEach(_h => {
            if(_h.hasProxyIp || _h.hasLocalIp){
                if(_h.isVia){
                    this.monitor.addLog(MESSAGE.LVL01.k,_h, '*')
                }
                if(_h.isForward){
                    this.monitor.addLog(MESSAGE.LVL02.k,_h, '*')
                }

            }else{
                if(_h.isVia){
                    this.monitor.addLog(MESSAGE.LVL03.k,_h, '*')
                }
                if(_h.isForward){
                    this.monitor.addLog(MESSAGE.LVL04.k,_h, '*')
                }
            }
        });
        return Promise.resolve()
    }

    get level():number{
        return this.level_detector ? this.level_detector.level : LevelDetection.DEFAULT_LEVEL
    }


    result(p:ProtocolType): JudgeResult {
        let result = new JudgeResult(p);

        result.id = this.id;
        result.start = this.monitor.start;
        result.stop = this.monitor.end;
        result.duration = this.monitor.duration;
        result.log = this.monitor.logs;
        result.error = this.monitor.lastError();
        result.level = this.level;

        return result;
    }


    private info(...msg: any[]) {
        Log.info.apply(Log, msg)
    }

    private debug(...msg: any[]) {
        //if (this._debug) {
            Log.debug.apply(Log, msg)
        //}
    }

    private throwedError(err: Error, ret?: any): any {
        Log.error(err);
        return ret
    }
}
