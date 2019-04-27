import * as http from "http";
import * as mUrl from 'url'
import * as net from 'net'

//import * as _request from "request-promise-native";
import {RequestResponseMonitor} from "./RequestResponseMonitor";

import {Judge} from "./Judge";
import {IJudgeRequestOptions} from "./IJudgeRequestOptions";


import Timer = NodeJS.Timer;
import {LevelDetection} from "./LevelDetection";
import {JudgeResult} from "./JudgeResult";
import {clearTimeout, setTimeout} from "timers";
import {IHttpHeaders, Log} from "@typexs/base";
import Exceptions from "@typexs/server/libs/server/Exceptions";
import {ProtocolType} from "../specific/ProtocolType";
import {MESSAGE} from "../specific/Messages";
import {IHttpGetOptions} from "../http/IHttpGetOptions";
import {HttpGotAdapter} from "../../adapters/http/got/HttpGotAdapter";
import {isStream} from "../http/IHttp";
import {IHttpPromise, IHttpStream} from "../http/IHttpResponse";


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
  private connect_timeout: number = 10000;
  private socket_timeout: number = 10000;

  readonly id: string;
  url: string;
  proxy_url: string;

  local_ip: string = null;
  proxy_ip: string = null;

  private judge: Judge;

  private level_detector: LevelDetection = null;

  response: any = null;

  httpPromise: IHttpPromise<any>;

  //request: _request.RequestPromise = null;
  request: http.ClientRequest;

  monitor: RequestResponseMonitor = null;

  judgeConnected: boolean = false;
  judgeDate: Date = null;

  headers_judge: IHttpHeaders = {};
  timer: Timer = null;
  socket: net.Socket = null;

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

    /*
    let opts: _request.RequestPromiseOptions = {
      resolveWithFullResponse: true,
      proxy: this.proxy_url,
      timeout: this.socket_timeout,
      forever: false
    };


    this.request = _request.get(this.url, opts);


    this.request.on('error', this.onRequestError.bind(this));
    this.request.on('socket', this.onSocket.bind(this));
*/
    this.timer = setTimeout(this.onConnectTimeout.bind(this), this.connect_timeout);
    let opts: IHttpGetOptions = {
      timeout: this.socket_timeout,
      proxy: this.proxy_url,
      retry: 0
    };

    let http = new HttpGotAdapter();
    let httpPromise = http.get(this.url, opts);
    if (!isStream(httpPromise)) {
      this.httpPromise = httpPromise;
      this.httpPromise.once('request', (request: http.ClientRequest) => {
        this.request = request;
        this.request.on('error', this.onRequestError.bind(this));
        this.request.on('socket', this.onSocket.bind(this));
      });
      this.monitor = new RequestResponseMonitor(this.url, opts, httpPromise, this.id/*, {debug: this._debug}*/);
      try {
        this.response = await this.httpPromise;
      } catch (e) {
        //Log.error(e);
        // Log.error(this.id,e)
        // Will be also in ReqResMonitor
      }
      return this.monitor.promise();

    } else {
      throw new Error('not a stream')
    }

  }


  private onSocket(socket: net.Socket) {
    Log.debug('JudgeRequest->onSocket ' + this.id);
    clearTimeout(this.timer);
    this.socket = socket;
    socket.setKeepAlive(false);
    socket.setTimeout(this.socket_timeout);
    socket.on('error', this.onSocketError.bind(this));
    socket.on('timeout', this.onSocketTimeout.bind(this));
    socket.on('lookup', this.onSocketLookup.bind(this));
    socket.on('data', this.onSocketData.bind(this))
    socket.on('end', this.onSocketEnd.bind(this));
    socket.on('close', this.onSocketClose.bind(this));
  }

  onSocketEnd() {
    Log.debug('JudgeRequest->onSocketEnd ' + this.id + ' ' + this.handleId());
  }

  onSocketClose() {
    Log.debug('JudgeRequest->onSocketClose ' + this.id + ' ' + this.handleId());
  }

  onSocketData(data: Buffer) {
    Log.debug('JudgeRequest->onSocketData ' + this.id + ' ' + this.handleId());
    this.socket.setTimeout(0);
  }

  handleId() {
    return this.socket['handle_id'];
  }

  onSocketLookup(error: Error | null, address: string, family: string | null, host: string) {
    Log.debug('JudgeRequest->onSocketLookup ' + this.id + ' ' + this.handleId());
    if (error) {
      this.handleError('lookup error', error)
    }
  }

  onSocketTimeout() {
    if (!this.judgeConnected) {
      this.socket.destroy(Exceptions.newSocketTimeout())
    }
  }

  onConnectTimeout() {
    this.monitor.stop();
    Log.error('judge connect timeout [' + this.id + '] after=' + this.duration);
    this.request.emit('error', Exceptions.newConnectTimeout(this.connect_timeout, this.duration))
  }

  private onRequestError(error: Error) {
    this.handleError('request error', error)
  }

  private onSocketError(error: Error) {
    this.handleError('socket error', error)
  }

  private handleError(type: string, error: Error) {
    Log.error('judge request [' + this.id + '] type=' + type, error);
    if (this.socket && !this.socket.destroyed) {
      if (error) {
        this.socket.destroy(error);
      } else {
        this.socket.destroy();
      }
    }
  }

  clear() {
    clearTimeout(this.timer);
    if (this.socket) {
      this.socket.removeAllListeners();

    }
    if (this.monitor) {
      this.monitor.clear();
    }

  }

  get duration() {
    return this.monitor.duration
  }


  async onJudge(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    Log.debug('onJudge ' + this.id);
    this.judgeConnected = true;
    this.judgeDate = new Date();
    //this.monitor.has_connected = true

    this.monitor.stop();
    this.monitor.addLog(MESSAGE.JDG01.k, {
      addr: req.socket.remoteAddress,
      port: req.socket.remotePort,
      duration: this.monitor.duration
    }, '*');
    this.level_detector.addRecvHeader(req.headers);
    await this.level_detector.detect();

    switch (this.level_detector.level) {
      case 1:
        this.monitor.addLog(MESSAGE.PRX01.k, {level: 1}, '*');
        break;
      case 2:
        this.monitor.addLog(MESSAGE.PRX02.k, {level: 2}, '*');
        break;
      case 3:
        this.monitor.addLog(MESSAGE.PRX03.k, {level: 3}, '*');
        break;
      default:
        this.monitor.addLog(MESSAGE.PRX10.k, {level: null}, '*');
        break;
    }


    this.level_detector.headers.forEach(_h => {
      if (_h.hasProxyIp || _h.hasLocalIp) {
        if (_h.isVia) {
          this.monitor.addLog(MESSAGE.LVL01.k, _h, '*')
        }
        if (_h.isForward) {
          this.monitor.addLog(MESSAGE.LVL02.k, _h, '*')
        }

      } else {
        if (_h.isVia) {
          this.monitor.addLog(MESSAGE.LVL03.k, _h, '*')
        }
        if (_h.isForward) {
          this.monitor.addLog(MESSAGE.LVL04.k, _h, '*')
        }
      }
    });
    return Promise.resolve()
  }

  get level(): number {
    return this.level_detector ? this.level_detector.level : LevelDetection.DEFAULT_LEVEL
  }


  result(from: ProtocolType, to: ProtocolType): JudgeResult {
    let result = new JudgeResult(from, to);
    result.id = this.id;
    result.start = this.monitor.start;
    result.stop = this.monitor.end;
    result.duration = this.monitor.duration;
    result.log = this.monitor.logs;
    result.error = this.monitor.lastError();
    result.level = this.level;

    return result;
  }

}
