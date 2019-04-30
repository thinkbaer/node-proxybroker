//import * as mRequest from "request-promise-native";

import * as net from 'net'
import * as http from 'http'

import * as mUrl from 'url'
import {Url, URL} from 'url'
import * as tls from 'tls'
import * as events from 'events'
import * as _ from 'lodash'
import {ReqResEvent} from "./ReqResEvent";

import {IHttpHeaders, Log, NestedException} from "@typexs/base";
import {MESSAGE} from "../specific/Messages";
import Exceptions from "@typexs/server/libs/server/Exceptions";
import {IHttp, HttpGotAdapter,IHttpOptions, IHttpResponse, IHttpGetOptions, IHttpPromise} from "commons-http";

export class RequestResponseMonitor extends events.EventEmitter {

  // _debug: boolean = false
  inc: number = 0;
  id: string = null;
  log_arr: Array<ReqResEvent> = [];
  length: number = 0;
  errors: NestedException[] = [];
  socket: net.Socket = null;
  // static cache:{[key:string]:RequestResponseMonitor} = {}

  // request: mRequest.RequestPromise = null;

  httpPromise: IHttpPromise<any>;

  request: http.ClientRequest;

  start: Date = new Date();
  end: Date = null;
  duration: number = Infinity;
  secured: boolean = false;
  connected: boolean = false;
  has_connected: boolean = false;
  timeouted: boolean = false;
  aborted: boolean = false;
  okay: boolean = false;
  _finished: boolean = false;

  sendedHead: string = '';
  receivedHead: string = '';
  receivedHeadDone: boolean = false;

  headers_request: IHttpHeaders = {};
  headers_response: IHttpHeaders = {};

  url: string;
  httpOptions: IHttpOptions;

  constructor(url: string, options: IHttpOptions, stream: IHttpPromise<any>, id?: string) {
    super();
    this.url = url;
    this.httpOptions = options;
    // this.debug('Enable monitor for '+id);
    //request.on('socket', this.onSocket.bind(this));
    stream.on('error', this.onError.bind(this));
    //request.on('drain', this.onDrain.bind(this));
    stream.on('request', this.onRequest.bind(this));


    this.id = id;
    //  this.request = request
    this.httpPromise = stream;

  }


  clear() {
    this.removeAllListeners();
    if (this.request) {
      this.request.removeAllListeners();
    }
    if (this.socket) {
      this.socket.removeAllListeners();
    }

  }

  get uri(): Url {
    return new URL(this.url);
  }

  get proxy(): string | Url {
    return this.httpOptions && _.has(this.httpOptions, 'proxy') ? new URL(this.httpOptions.proxy) : null;
  }

  get tunnel(): boolean {
    // TODO detect tunneling
    return false; //<boolean>this.request['tunnel']
  }


  hasError() {
    return this.errors.length > 0
  }

  /**
   *
   * @see https://nodejs.org/api/http.html#http_event_response
   *
   * TODO: lookup tunneling!
   *
   * @param request
   */
  onRequest(request: http.ClientRequest) {
    // this.debug('onRequest');
    this.request = request;
    request.setNoDelay(true);
    this.request.on('socket', this.onSocket.bind(this));
    this.request.on('error', this.onError.bind(this));

    if (this.proxy) {
      this.addLog(MESSAGE.ORQ01.k, {uri: mUrl.format(this.uri), proxy_uri: mUrl.format(this.proxy)});
    } else {
      this.addLog(MESSAGE.ORQ02.k, {uri: mUrl.format(this.uri)});
    }

    // this.addLog('disable KEEPALIVE')
    // request.setSocketKeepAlive(false,0)

    this.addLog(MESSAGE.ORQ03.k);


    if (this.proxy && this.tunnel) {
      this.addLog(MESSAGE.ORQ04.k);
      // this.debug('tunneling enabled')
    }

    //request.on('abort', this.onRequestAbort.bind(this));
    //request.on('aborted', this.onRequestAborted.bind(this));
    //request.on('connect', this.onRequestConnect.bind(this));
    //request.on('continue', this.onRequestContinue.bind(this));
    request.once('response', this.onRequestResponse.bind(this));
    //request.on('upgrade', this.onRequestUpgrade.bind(this));

    for (let k in request['_headers']) {
      this.headers_request[k] = <string>request.getHeader(k)
    }
  }


  onRequestResponse(response: http.IncomingMessage) {
    for (let k in response.headers) {
      this.headers_response[k] = <string>response.headers[k]
    }
  }

  /**
   * Fired for example if socket can't be estabilshed on tunneling to wrong host
   *
   * @param {Error} error
   */
  onError(error: Error) {
    //this.debug('onError');
    this.handleError(error);
    this.finished()
  }

  /**
   * Socket established
   *
   * @param socket
   */
  onSocket(socket: net.Socket) {
    // this.debug('onSocket');
    this.socket = socket;

    socket.on('close', this.onSocketClose.bind(this));
    socket.on('connect', this.onSocketConnect.bind(this));

    //  socket.on('drain', this.onSocketDrain.bind(this));
    socket.on('end', this.onSocketEnd.bind(this));
    socket.on('error', this.onSocketError.bind(this));
    socket.on('lookup', this.onSocketLookup.bind(this));
    socket.on('timeout', this.onSocketTimeout.bind(this));
    socket.on('data', this.onSocketData.bind(this));

    if (socket instanceof tls.TLSSocket) {
      // this.debug('IS TLSSocket');
      this.secured = true;
      socket.on('secureConnect', this.onTLSSocketSecureConnect.bind(this))
    } else {


    }
    if (socket['_pendingData']) {
      this.sendedHead = socket['_pendingData'];
      this.sendedHead = this.sendedHead.split('\r\n\r\n').shift()
    }

  }

  onSocketClose(had_error: boolean) {
    //this.debug('RRM->onSocketClose with error: ' + had_error);
    this.finished()
  }


  onSocketConnect() {
    this.errors = [];
    // this.debug('onSocketConnect');
    this.connected = true;

    if (this.proxy) {
      this.addLog(MESSAGE.OSC01.k, {uri: mUrl.format(this.proxy)})
    } else {
      this.addLog(MESSAGE.OSC02.k, {addr: this.socket.remoteAddress, port: this.socket.remotePort})
    }

    if (this.secured) {
      this.addLog(MESSAGE.OSC03.k)
    }

    if (!_.isEmpty(this.sendedHead)) {
      this.sendedHead.split('\n').map((x: string) => {
        this.addClientLog(MESSAGE.HED01.k, {header: x ? x : '_UNKNOWN_'})
      })
    }
  }


  // TODO use SocketHandle
  onSocketData(data: Buffer) {
    // this.debug('onSocketData', data.length);

    this.socket.removeListener('timeout', this.onSocketTimeout.bind(this));

    this.length += data.length;

    if (data[0] == 0x16 || data[0] == 0x80 || data[0] == 0x00) {
      this.debug('TLS detected ' + data.length);
      return;
    }


    if (!this.receivedHeadDone) {
      let tmp: Buffer = Buffer.allocUnsafe(data.length);
      data.copy(tmp);

      this.receivedHead += tmp.toString('utf8');
      if (this.receivedHead.match(/\r\n\r\n/)) {
        this.receivedHead = this.receivedHead.split("\r\n\r\n").shift(); // "\r\n\r\n"
        this.receivedHeadDone = true
      }

      if (this.receivedHeadDone) {
        let headers = _.clone(this.receivedHead.split('\n'));
        headers.map((x: string) => {
          this.addServerLog(MESSAGE.HED01.k, {header: x ? x : '_UNKNOWN_'})
        });


        let http_head = headers.shift();
        let http_heads = http_head.split(' ', 3);

        if (http_heads.length === 3) {
          if (/^\d{3}$/.test(http_heads[1])) {
            let code = parseInt(http_heads[1]);
            if (!(200 <= code && code < 300)) {
              this.socket.destroy(new Error(http_head))
            }
          }
        }
      }
    }


  }


  onSocketEnd() {
    //  this.debug('RRM->onSocketEnd');
    this.addClientLog(MESSAGE.OSE01.k)
  }

  onSocketError(error: Error) {
    //this.debug('onSocketError');
    this.handleError(error)
  }

  onSocketLookup(error: Error | null, address: string, family: string | null, host: string) {
    //this.debug('onSocketLookup');
    this.handleError(error)
  }

  onSocketTimeout() {
    this.stop();
    this.addLog(MESSAGE.OST01.k, {duration: this.duration})
  }

  /*
      onTLSSocketOCSPResponse(buffer: Buffer) {
          this.debug('onTLSSocketOCSPResponse')
      }
  */
  onTLSSocketSecureConnect() {
//    this.debug('onTLSSocketSecureConnect');
    this.stop();
    this.addLog(MESSAGE.OTS01.k, {duration: this.duration})
  }


  stop() {
    this.end = new Date();
    this.duration = this.end.getTime() - this.start.getTime()
  }


  get logs() {
    return _.clone(this.log_arr)
  }


  logToString(sep: string = "\n"): string {
    let msg: Array<string> = [];

    this.log_arr.sort(function (a: ReqResEvent, b: ReqResEvent) {
      return a.nr < b.nr ? (b.nr > a.nr ? -1 : 0) : 1
    });

    let ignore_emtpy = false;
    for (let entry of this.log_arr) {
      let str = (entry.prefix + ' ' + entry.message()).trim();
      if (str.length == 0 && ignore_emtpy) {
        continue
      } else if (str.length == 0) {
        ignore_emtpy = true
      } else {
        ignore_emtpy = false
      }
      msg.push(str)
    }

    return msg.join(sep)
  }


  private handleError(_error: Error): boolean {
    if (_error) {
      let error = Exceptions.handle(_error);

      let exists = false;
      for (let i = 0; i < this.errors.length; i++) {
        if (this.errors[i].message == error.message) {
          exists = true;
          break;
        }
      }


      if (!exists) {

        if (error.message.match(/ECONNREFUSED/)) {
          this.connected = false;
          this.addLog(MESSAGE.ERR03.k, null, '#')
        } else if (error.message.match(/ESOCKETTIMEDOUT/) || error.message.match(/Timeout awaiting/)) {
          this.timeouted = true;
          this.addLog(MESSAGE.ERR04.k, null, '#')
        } else if (error.message.match(/socket hang up/)) {
          this.aborted = true;
          this.addLog(MESSAGE.ERR05.k, null, '#')
        }
        this.errors.push(error);


        return true
      }
    }
    return false

  }

  lastError(): NestedException | null {
    if (this.errors.length > 0) {
      return this.errors[this.errors.length - 1]
    }
    return null
  }

  finished() {

    this.stop();
    // this.debug('RRM->finished');

    let last_error = this.lastError();

    if (!this.errors.length) {
      this.addLog(MESSAGE.RCL01.k, {length: this.length})
    }


    // this.socket.removeAllListeners(this)

    // this.socket = null

    if (last_error) {
      this.addClientLog(MESSAGE.ERR01.k);
      this.errors.forEach((err: Error) => {
        this.addClientLog(MESSAGE.ERR02.k, {error: err.message})
      })
    }

    if (!last_error) {
      this.addLog(MESSAGE.RCC01.k, {uri: mUrl.format(this.uri), duration: this.duration})
    } else {
      this.addLog(MESSAGE.CNE01.k)
    }

    this._finished = true;
    this.emit('finished', last_error)
  }

  promise(): Promise<RequestResponseMonitor> {

    let self = this;
    return new Promise(function (resolve, reject) {
      if (!self._finished) {
        self.once('finished', function () {
          resolve(self);
        })
      } else {
        resolve(self);
      }
    })

  }


  debug(...msg: any[]) {
    if (msg.length > 0 && typeof msg[0] === 'string') {
      msg[0] = this.id + ' ' + msg[0];
    } else {
      msg.unshift(this.id);
    }
    Log.debug.apply(Log, msg)
  }

  /**
   * Protokol handler
   *
   * @param msgId
   * @param parameter
   */

  addClientLog(msgId: string, parameter?: { [k: string]: any }): void {
    this.addLog(msgId, parameter, '>')
  }

  addServerLog(msgId: string, parameter?: { [k: string]: any }): void {
    this.addLog(msgId, parameter, '<')
  }

  addLog(msgId: string, parameter: { [k: string]: any } = null, s: string = '*'): void {
    let _inc = this.inc++;

    let rre = new ReqResEvent({
      nr: _inc,
      connId: this.id,
      msgId: msgId,
      params: _.clone(parameter),
      time: new Date(),
      prefix: s
    });

    this.log_arr.push(rre);
    Log.debug(rre.logMsg());
  }

}
