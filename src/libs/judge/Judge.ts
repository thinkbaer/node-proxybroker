import * as http from "http";
import * as https from "https";

//import * as _request from "request-promise-native";
import * as tls from 'tls'
import * as mUrl from 'url'
import * as net from 'net'
import * as _ from 'lodash'


import {JudgeRequest} from "./JudgeRequest";
import {DEFAULT_JUDGE_OPTIONS, IJudgeOptions} from "./IJudgeOptions";

import {JudgeResults} from "./JudgeResults";
import {JudgeResult} from "./JudgeResult";
import {IServerApi, Server} from "@typexs/server";
import {CryptUtils, DomainUtils, Log, Progress, TodoException} from "@typexs/base";
import {MESSAGE, Messages} from "../specific/Messages";
import {ProtocolType} from "../specific/ProtocolType";
import {IHttp, isStream} from "../http/IHttp";
import {HttpGotAdapter} from "../../adapters/http/got/HttpGotAdapter";
import {IHttpPromise, IHttpResponse} from "../http/IHttpResponse";


const FREEGEOIP: string = 'http://ip-api.com/json/';
const IPCHECK_URL = 'https://api.ipify.org?format=json';


export class Judge implements IServerApi {

  private inc: number = 0;

  private _options: IJudgeOptions = {};

  private httpServer: Server = null;

  private httpsServer: Server = null;

  private enabled: boolean = false;

  private progress: Progress = new Progress();

  private runnable: boolean = false;

  private cache_sum: number = 0;

  private cache: { [key: string]: JudgeRequest } = {};

  private http: IHttp;

  constructor(options: IJudgeOptions = {}) {
    this._options = _.defaultsDeep(options, DEFAULT_JUDGE_OPTIONS);

    this.http = new HttpGotAdapter();
    this.httpServer = new Server();
    this.httpServer.initialize({
      protocol: 'http',
      ip: this._options.ip,
      port: this._options.http_port,
      fn: this.judge.bind(this)
    }, this);

    this.httpsServer = new Server();
    this.httpsServer.initialize({
      protocol: 'https',
      ip: this._options.ip,
      port: this._options.https_port,
      fn: this.judge.bind(this),
      key: <any>this._options.ssl.key,
      key_file: this._options.ssl.key_file,
      cert: <any>this._options.ssl.cert,
      cert_file: this._options.ssl.cert_file,
      //strictSSL: true
    }, this)
  }


  async prepare(): Promise<boolean> {
    let infos: any = {
      http: this.remote_url('http'),
      https: this.remote_url('https')
    };

    try {

      if (this._options.remote_lookup) {
        this._options.remote_ip = await this.getRemoteAccessibleIp();

        infos.http = this.remote_url('http');
        infos.https = this.remote_url('https');
      }

      if (this._options.selftest) {
        await this.wakeup(true);
        this.runnable = await this.selftest();
        await this.pending();
      } else {
        this.runnable = true;
      }

      infos.ip = this._options.remote_ip;
      infos.runnable = this.runnable;
      infos.selftest = this._options.selftest;

      Log.info(Messages.get(MESSAGE.JDG02.k, infos));

      return Promise.resolve(this.runnable);
    } catch (err) {
      Log.error(err);
      throw err
    }
  }


  beforeStart(server: Server): Promise<any> {
    if (server.isSecured) {
      server.server.on('secureConnection', this.onSecureConnection.bind(this))
    } else {
      server.server.on('connection', this.onServerConnection.bind(this))
    }
    return null
  }


  get ip(): string {
    return this._options.ip
  }


  get remote_ip(): string {
    return this._options.remote_ip
  }

  get options(): IJudgeOptions {
    return this._options;
  }


  url(protocol: string = 'http'): string {
    switch (protocol) {
      case 'http':
        return this.httpServer.url();
      case 'https':
        return this.httpsServer.url();
      default:
        throw new TodoException('protocol not found');
    }

  }

  remote_url(protocol: string = 'http'): string {
    switch (protocol) {
      case 'http':
        return protocol + '://' + this.remote_ip + ':' + this._options.http_port;
      case 'https':
        return protocol + '://' + this.remote_ip + ':' + this._options.https_port;
      default:
        throw new TodoException('protocol not found');
    }

  }


  private async getRemoteAccessibleIp(): Promise<any> {
    // If IP is fixed, it should be configurable ...
    try {
      let response_data: IHttpResponse<any> = <IHttpResponse<any>>(await this.http.get(IPCHECK_URL));
      let json = JSON.parse(response_data.body);
      this._options.remote_ip = json.ip;
      return json.ip
    } catch (err) {
      Log.error(err);
      throw err
    }
  }


  private async selftestByProtocol(protocol: string = 'http'): Promise<any> {
    let ping_url = this.remote_url(protocol) + '/ping';
    this.debug('ping url ' + ping_url);
    let start = new Date();
    let response: IHttpResponse<any> = <IHttpResponse<any>>(await this.http.get(ping_url));
    //let res = await _request.get(ping_url);
    let s = JSON.parse(response.body);

    let stop = new Date();
    let c_s = s.time - start.getTime();
    let s_c = stop.getTime() - s.time;
    let full = stop.getTime() - start.getTime();

    return {
      url: ping_url,
      // client 2 server
      c2s: c_s,
      // server 2 client
      s2c: s_c,
      full: full
    }
  }


  /**
   *  Check if Judge
   */
  private async selftest(): Promise<boolean> {
    // Startup
    this.runnable = false;

    try {
      let results = await Promise.all([
        this.selftestByProtocol('http'),
        this.selftestByProtocol('https'),
      ]);

      this.info('Selftest results:\n' + JSON.stringify(results, null, 2));

      /*
      this.info('Selftest results for request to ' + ping_url + '\n' +
          ' - duration from client to judge service: ' + c_s + 'ms\n' +
          ' - duration from judge service to client: ' + s_c + 'ms\n' +
          ' - summarized: ' + full + 'ms');
      return true
      */

      return true
    } catch (err) {
      return this.throwedError(err, false)
    }
  }


  createRequest(protocol: string, proxy_url: string, options: { local_ip?: string, socket_timeout?: number, connection_timeout?: number } = {}): JudgeRequest {
    let inc = this.inc++;

    let judge_url = this.remote_url(protocol);
    let req_id = CryptUtils.shorthash(judge_url + '-' + proxy_url + '-' + (new Date().getTime()) + '-' + inc);
    judge_url += '/judge/' + req_id;
    this.debug('judge: create request ' + req_id + ' to ' + judge_url + ' over ' + proxy_url + ' (cached: ' + this.cache_sum + ')');

    let req_options = _.assign(this._options.request, options);
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
    let _url: mUrl.Url = mUrl.parse(req.url);
    let paths = _url.path.split('/').filter((x) => {
      return x || x.length != 0;
    });
    let first_path = paths.shift();
    let cached_req: JudgeRequest = null;

    if (first_path === 'judge' && paths.length == 1) {

      let self = this;
      let req_id = paths.shift();
      this.debug('judge call ' + req_id);

      if (this.cache[req_id]) {
        cached_req = this.cache[req_id];
        req.socket.once('end', () => {
          self.removeFromCache(req_id);
        })
        req.socket.once('error', () => {
          self.removeFromCache(req_id);
        })
      }

      if (cached_req && this.enabled) {
        await cached_req.onJudge(req, res);
        res.writeHead(200, {"Content-Type": "application/json"});
        let json = JSON.stringify({time: (new Date()).getTime(), headers: req.headers});
        res.end(json);
      } else {
        Log.error('judge: no cache id for incoming request with ' + req_id + ' from ' + req.url);
        res.writeHead(400, {"Content-Type": "application/json"});
        let json = JSON.stringify({'error': '400'});
        res.end(json);
      }

    } else if (first_path === 'ping') {
      res.writeHead(200, {"Content-Type": "application/json"});
      let json = JSON.stringify({time: (new Date()).getTime(), ping: true});
      res.end(json);
    } else {
      Log.error('judge: unknown request from ' + req.url);
      res.writeHead(404, {"Content-Type": "application/json"});
      let json = JSON.stringify({'error': '404'});
      res.end(json);
    }
  }


  isEnabled() {
    return this.enabled;
  }


  private enable() {
    this.enabled = true;
    this.info('Judge services started up:\n\t- ' + this.httpServer.url() + '\n\t- ' + this.httpsServer.url());
  }


  private disable() {
    this.enabled = false;
    this.info('Judge services shutting down on:\n\t- ' + this.httpServer.url() + '\n\t- ' + this.httpsServer.url());
  }


  async handleRequest(ip: string, port: number, from: ProtocolType, to: ProtocolType): Promise<JudgeResult> {
    let proto_from = (from === ProtocolType.HTTP ? 'http' : 'https');
    let proto_to = (to === ProtocolType.HTTP ? 'http' : 'https');
    let url = proto_from + '://' + ip + ':' + port;
    let http_request = this.createRequest(proto_to, url);
    await http_request.performRequest();
    let result = http_request.result(from, to);
    this.removeFromCache(http_request.id);
    http_request.clear();

    this.debug('judge: finished request (' + proto_from + '=>' + proto_to + ') ' + http_request.id +
      ' from ' + url + ' t=' + result.duration +
      ' error=' + result.hasError() + ' (cached: ' + this.cache_sum + ')');
    return result
  }


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
      let response: IHttpResponse<any> = <IHttpResponse<any>>(await this.http.get(geo_url));
      //let geodata: string = await _request.get(geo_url);
      if (response.body) {
        results.geo = true;
        // TODO use specific geo ip handler
        let geojson: { [k: string]: string } = JSON.parse(response.body);
        _.keys(geojson).filter((k) => {
          return ['ip'].indexOf(k) == -1
        }).forEach(k => {
          results[k] = geojson[k]
        })
      }
    } catch (e) {
      Log.error(e)
    }

    let promises: Promise<any>[] = [];

    if (enable.http) {
      // HTTP => HTTP
      promises.push(this.handleRequest(ip, port, ProtocolType.HTTP, ProtocolType.HTTP).then(result => {
        results.variants.push(result);
      }));

      // HTTP => HTTPS

      promises.push(this.handleRequest(ip, port, ProtocolType.HTTP, ProtocolType.HTTPS).then(result => {
        results.variants.push(result);
      }));


    }

    if (enable.https) {
      // HTTPS => HTTP
      promises.push(this.handleRequest(ip, port, ProtocolType.HTTPS, ProtocolType.HTTP).then(result => {
        results.variants.push(result);
      }));

      // HTTPS => HTTPS

      promises.push(this.handleRequest(ip, port, ProtocolType.HTTPS, ProtocolType.HTTPS).then(result => {
        results.variants.push(result);
      }));

    }

    return Promise.all(promises).then(_res => {
      return results;
    })
  }

  private onSecureConnection(socket: tls.TLSSocket) {
    this.onServerConnection(socket);
  }

  private onServerConnection(socket: net.Socket) {
    let self = this;
    this.debug('Judge->onServerConnection');

    function onData(data: Buffer) {
      if (data[0] == 0x16 || data[0] == 0x80 || data[0] == 0x00) {
        this.debug('Judge->TLS detected ' + data.length);
        return;
      }


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


    return Promise.all([
      self.httpServer.start(),
      self.httpsServer.start()
    ])
      .then(_x => {
        self.enable();
        return true
      })


      // TODO check if address and port are bound, on expcetion shutdown connection
      /*
      return new Promise<boolean>(function (resolve, reject) {
          try {
              if (self.runnable || (!self.runnable && force)) {
                  self.$connections = {};

                  self.httpsServer = https.createServer(self.options.ssl, self.judge.bind(self));
                  self.setupTLS(self.httpsServer)

                  self.httpServer = http.createServer(self.judge.bind(self))
                  self.httpServer.on('error', (err) => {
                      let nErr = Exceptions.handle(err);
                      if (nErr.code === Exceptions.EADDRINUSE) {
                          reject(err)
                      } else {
                          Log.error('Judge server error:', err)
                      }
                  });

                  self.httpServer.listen(parseInt(self._judge_url.port), self._judge_url.hostname, function () {
                      self.enable();
                      resolve(true)
                  })
              } else {
                  throw new Error('This will not work!')
              }
          } catch (e) {
              reject(e)
          }
      })*/
      .then(async r => {
        await self.progress.ready();
        return r
      })
      .catch(err => {
        Log.error(err);
        throw err
      })
  }


  async pending(): Promise<any> {
    let self = this;

    // this.info('judge pending ...')
    await this.progress.startWhenReady();

    if (!this.isEnabled()) {
      return Promise.resolve(true)
    }

    return Promise.all([
      self.httpServer.stop(),
      self.httpsServer.stop()
    ])
      .then(x => {
        self.disable();
        return true
      })

      /*
              return new Promise(async function (resolve, reject) {
                  try {
                      if (self.httpServer) {
                          self.httpServer.removeAllListeners();

                          for (let conn in self.$connections) {
                              self.$connections[conn].destroy()
                          }

                          self.httpServer.close(function () {
                              self.disable();
                              resolve(true)
                          });
                      } else {
                          resolve(false)
                      }
                  } catch (e) {
                      reject(e)
                  }
              })
              */
      .then(async r => {
        await self.progress.ready();
        return r
      })
      .catch(err => {
        throw err
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
