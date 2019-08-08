import * as http from 'http';
import * as mUrl from 'url';
import * as _ from 'lodash';
import * as net from 'net';
// import * as _request from "request-promise-native";
import {RequestResponseMonitor} from './RequestResponseMonitor';

import {Judge} from './Judge';
import {IJudgeRequestOptions} from './IJudgeRequestOptions';
import {LevelDetection} from './LevelDetection';
import {JudgeResult} from './JudgeResult';
import {clearTimeout} from 'timers';
import {Log} from '@typexs/base';
import Exceptions from '@typexs/server/libs/server/Exceptions';
import {ProtocolType} from '../specific/ProtocolType';
import {MESSAGE} from '../specific/Messages';
import {HttpFactory, IHttp, IHttpGetOptions, IHttpStream, isStream} from 'commons-http';
import Timer = NodeJS.Timer;


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

  static HTTP: IHttp;

  _debug = false;

  private active = false;

  private aborted = false;

  private timeout = 10000;

  readonly id: string;

  url: string;

  proxy_url: string;

  local_ip: string = null;

  proxy_ip: string = null;

  private judge: Judge;

  private level_detector: LevelDetection = null;

  stream: IHttpStream<any>;

  request: http.ClientRequest;

  monitor: RequestResponseMonitor = null;

  judgeConnected = false;

  judgeDate: Date = null;

  timer: Timer = null;

  socket: net.Socket = null;

  socketStack: net.Socket[] = [];

  // proxy_hostname:string = null
  options: IJudgeRequestOptions;

  errors: Error[] = [];

  constructor(judge: Judge, id: string, url: string, proxy_url: string, options?: IJudgeRequestOptions) {
    this.options = options || {};
    this.judge = judge;
    this.url = url;
    this.id = id;

    this.proxy_url = proxy_url;
    this.timeout = _.get(options, 'timeout', 10000);

    this.local_ip = options.local_ip || this.judge.ip;
    this.proxy_ip = mUrl.parse(this.proxy_url).hostname;
  }


  get duration() {
    return this.monitor.duration;
  }


  get level(): number {
    return this.level_detector ?
      this.level_detector.level : LevelDetection.DEFAULT_LEVEL;
  }

  httpClient() {
    if (!JudgeRequest.HTTP) {
      JudgeRequest.HTTP = HttpFactory.create();
    }
    return JudgeRequest.HTTP;
  }

  async performRequest(): Promise<RequestResponseMonitor> {
    this.active = true;
    this.level_detector = new LevelDetection(this.proxy_ip, this.local_ip);
    await this.level_detector.prepare();

    const opts: IHttpGetOptions & { stream: boolean } = {
      timeout: this.timeout,
      proxy: this.proxy_url,
      retry: _.get(this.options, 'retry', 0),
      stream: true,
      rejectUnauthorized: _.get(this.options, 'rejectUnauthorized', false)
    };

    // tslint:disable-next-line:no-shadowed-variable

    // try {
//    this.timer = setTimeout(this.onConnectTimeout.bind(this), this.timeout);
    const stream = this.httpClient().get(this.url, opts);
    if (!isStream(stream)) {
      throw new Error('is not a stream');
    }
    this.stream = stream;
    this.stream.on('request', this.onRequest.bind(this));

    this.monitor = new RequestResponseMonitor(this.url, opts, this.stream, this.id);

    return this.monitor.promise();
  }


  private onRequest(request: http.ClientRequest) {
    this.request = request;
    this.request.on('socket', this.onSocket.bind(this));
    this.request.on('error', this.onRequestError.bind(this));

  }


  private onSocket(socket: net.Socket) {
    this.socketStack.push(socket);

    // Log.debug('JudgeRequest->onSocket ' + this.id + ' has socket: ' + !!socket + ' socket stack: ' + this.socketStack.length);
    clearTimeout(this.timer);
    this.socket = socket;
    socket.on('error', this.onSocketError.bind(this));
    socket.on('timeout', this.onSocketTimeout.bind(this));
    socket.on('data', this.onSocketData.bind(this));
  }


  onSocketData(data: Buffer) {
    // Log.debug('JudgeRequest->onSocketData ' + this.id + ' ' + this.handleId());
    this.socket.setTimeout(0);
  }


  onSocketTimeout() {
    if (!this.judgeConnected) {
      this.handleError('timeout error', Exceptions.newSocketTimeout());
    }
  }


  private onRequestError(error: Error) {
    this.handleError('request error', error);
  }


  private onSocketError(error: Error) {
    this.handleError('socket error', error);
  }

  private freeSockets(error?: Error) {
    for (const socket of this.socketStack) {
      this.freeSocket(socket, error);
    }
  }


  private freeSocket(socket: net.Socket, error?: Error) {
    if (socket && !socket.destroyed) {
      if (error) {
        socket.destroy(error);
      } else {
        socket.destroy();
      }
    }
  }


  private handleError(type: string, error: Error) {
    if (this.errors.indexOf(error) !== -1) {
      return;
    }
    this.errors.push(error);
    this.abort();
    Log.error('judge request [' + this.id + '] type=' + type, error);
  }

  abort() {
    if (!this.aborted) {
      this.aborted = true;
      this.request.emit('abort', _.last(this.errors));
      this.request.abort();
    }
  }

  clear() {
    if (!this.active) {
      return;
    }
    Log.debug('judge request: clear ' + this.id);
    this.active = false;

    clearTimeout(this.timer);
    if (this.monitor) {
      this.monitor.clear();
    }

    if (this.request) {
      this.request.removeListener('socket', this.onSocket.bind(this));
      this.request.removeListener('error', this.onRequestError.bind(this));
      this.request = null;
    }

    if (this.socket) {
      this.socket.removeListener('error', this.onSocketError.bind(this));
      this.socket.removeListener('timeout', this.onSocketTimeout.bind(this));
      this.socket.removeListener('data', this.onSocketData.bind(this));
      this.socket = null;
    }

    if (this.stream) {
      this.stream.removeListener('request', this.onRequest.bind(this));
      this.stream = null;
    }

    this.freeSockets();
  }


  async onJudge(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    Log.debug('onJudge ' + this.id);
    this.judgeConnected = true;
    this.judgeDate = new Date();
    // this.monitor.has_connected = true

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
          this.monitor.addLog(MESSAGE.LVL01.k, _h, '*');
        }
        if (_h.isForward) {
          this.monitor.addLog(MESSAGE.LVL02.k, _h, '*');
        }
      } else {
        if (_h.isVia) {
          this.monitor.addLog(MESSAGE.LVL03.k, _h, '*');
        }
        if (_h.isForward) {
          this.monitor.addLog(MESSAGE.LVL04.k, _h, '*');
        }
      }
    });
    return Promise.resolve();
  }


  result(from: ProtocolType, to: ProtocolType): JudgeResult {
    const result = new JudgeResult(from, to);
    result.id = this.id;
    result.start = this.monitor.start;
    result.stop = this.monitor.end;
    result.duration = this.monitor.duration;
    result.log = this.monitor.logs;
    result.setError(this.monitor.lastError());
    result.level = this.level;
    return result;
  }

}
