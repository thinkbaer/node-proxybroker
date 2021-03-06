import * as http from 'http';
import * as https from 'https';
// import * as _request from "request-promise-native";
import * as tls from 'tls';
import * as mUrl from 'url';
import * as net from 'net';
import * as _ from 'lodash';


import {JudgeRequest} from './JudgeRequest';
import {DEFAULT_JUDGE_OPTIONS, IJudgeOptions} from './IJudgeOptions';

import {JudgeResults} from './JudgeResults';
import {JudgeResult} from './JudgeResult';
import {IServerApi, Server} from '@typexs/server';
import {CryptUtils, DomainUtils, ILoggerApi, Log, TodoException} from '@typexs/base';
import {MESSAGE, Messages} from '../specific/Messages';
import {ProtocolType} from '../specific/ProtocolType';
import {HttpFactory, IHttp, IHttpResponse} from 'commons-http';
import {DEFAULT_USER_AGENT, K_JUDGE_REQUEST_TIMEOUT} from '../Constants';
import {LockFactory} from '@typexs/base/libs/LockFactory';


const FREEGEOIP = 'http://ip-api.com/json/';
const IPCHECK_URL = 'https://api.ipify.org?format=json';


export class Judge implements IServerApi {

  private inc = 0;

  private _options: IJudgeOptions = {};

  private httpServer: Server = null;

  private httpsServer: Server = null;

  private enabled = false;

  // private progress: Progress = new Progress();

  private lock = LockFactory.$().semaphore(1);

  private runnable = false;

  private cache_sum = 0;

  private cache: { [key: string]: JudgeRequest } = {};

  private http: IHttp;

  private logger: ILoggerApi;

  constructor(options: IJudgeOptions = {}) {
    this._options = _.defaultsDeep(options, DEFAULT_JUDGE_OPTIONS);

    this.http = HttpFactory.create();
    this.logger = _.get(options, 'logger', Log.getLoggerFor(Judge));

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
      // strictSSL: true
    }, this);
  }


  async prepare(): Promise<boolean> {
    await this.http.isAvailable();
    const infos: any = {
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

      this.logger.info(Messages.get(MESSAGE.JDG02.k, infos));

      return Promise.resolve(this.runnable);
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }


  beforeStart(server: Server): Promise<any> {
    if (server.isSecured) {
      server.server.on('secureConnection', this.onSecureConnection.bind(this));
    } else {
      server.server.on('connection', this.onServerConnection.bind(this));
    }
    return null;
  }


  get ip(): string {
    return this._options.ip;
  }


  get remote_ip(): string {
    return this._options.remote_ip;
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
      const options = {
        timeout: _.get(this.options, K_JUDGE_REQUEST_TIMEOUT, 10000)
      };
      const response_data: IHttpResponse<any> =
        <IHttpResponse<any>>(await this.http.get(IPCHECK_URL, options));
      const json = JSON.parse(response_data.body);
      this._options.remote_ip = json.ip;
      return json.ip;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }


  private async selftestByProtocol(protocol: string = 'http'): Promise<any> {
    const ping_url = this.remote_url(protocol) + '/ping';
    this.logger.debug('ping url ' + ping_url);
    const start = new Date();

    const options = {
      rejectUnauthorized: false,
      timeout: _.get(this.options, K_JUDGE_REQUEST_TIMEOUT, 10000),
      headers: {
        'user-agent': DEFAULT_USER_AGENT
      }
    };

    const response: IHttpResponse<any> = <IHttpResponse<any>>
      (await this.http.get(ping_url, options));
    // let res = await _request.get(ping_url);
    const s = JSON.parse(response.body);

    const stop = new Date();
    const c_s = s.time - start.getTime();
    const s_c = stop.getTime() - s.time;
    const full = stop.getTime() - start.getTime();

    return {
      url: ping_url,
      // client 2 server
      c2s: c_s,
      // server 2 client
      s2c: s_c,
      full: full
    };
  }


  /**
   *  Check if Judge
   */
  private async selftest(): Promise<boolean> {
    // Startup
    this.runnable = false;

    try {
      const results = await Promise.all([
        this.selftestByProtocol('http'),
        this.selftestByProtocol('https'),
      ]);


      /*
      this.info('Selftest results for request to ' + ping_url + '\n' +
          ' - duration from client to judge service: ' + c_s + 'ms\n' +
          ' - duration from judge service to client: ' + s_c + 'ms\n' +
          ' - summarized: ' + full + 'ms');
      return true
      */

      return true;
    } catch (err) {
      return this.throwedError(err, false);
    }
  }


  createRequest(protocol: string, proxy_url: string, options:
    { local_ip?: string, timeout?: any } = {}): JudgeRequest {
    const inc = this.inc++;

    let judge_url = this.remote_url(protocol);
    const req_id = CryptUtils.shorthash(judge_url + '-' + proxy_url + '-' + (new Date().getTime()) + '-' + inc);
    judge_url += '/judge/' + req_id;
    this.logger.debug('judge: create request ' + req_id + ' to ' + judge_url + ' over ' + proxy_url + ' (cached: ' + this.cache_sum + ')');

    const req_options = _.assign(this._options.request, options);
    const judgeReq = new JudgeRequest(this, req_id, judge_url, proxy_url, req_options);
    return this.addToCache(judgeReq);
  }


  private addToCache(req: JudgeRequest): JudgeRequest {
    this.cache_sum++;
    this.cache[req.id] = req;
    return this.cache[req.id];
  }


  private removeFromCache(id: string) {
    if (this.cache[id]) {
      this.cache_sum--;
      delete this.cache[id];
    }
  }


  /**
   * Judge root callback
   *
   * @param req
   * @param res
   */
  public async judge(req: http.IncomingMessage, res: http.ServerResponse) {
    const _url: mUrl.Url = mUrl.parse(req.url);
    const paths = _url.path.split('/').filter((x) => {
      return x || x.length !== 0;
    });
    const first_path = paths.shift();
    let cached_req: JudgeRequest = null;

    if (first_path === 'judge' && paths.length === 1) {

      const self = this;
      const req_id = paths.shift();
      this.logger.trace('judge call ' + req_id);

      if (this.cache[req_id]) {
        cached_req = this.cache[req_id];
        req.socket.once('end', () => {
          self.removeFromCache(req_id);
        });
        req.socket.once('error', () => {
          self.removeFromCache(req_id);
        });
      }

      if (cached_req && this.enabled) {
        await cached_req.onJudge(req, res);
        res.writeHead(200, {'Content-Type': 'application/json'});
        const json = JSON.stringify({time: (new Date()).getTime(), headers: req.headers});
        res.end(json);
      } else {
        this.logger.debug('judge: no cache id for incoming request with ' + req_id + ' from ' + req.url);
        res.writeHead(400, {'Content-Type': 'application/json'});
        const json = JSON.stringify({'error': '400'});
        res.end(json);
      }

    } else if (first_path === 'ping') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      const json = JSON.stringify({time: (new Date()).getTime(), ping: true});
      res.end(json);
    } else {
      this.logger.error('judge: unknown request from ' + req.url);
      res.writeHead(404, {'Content-Type': 'application/json'});
      const json = JSON.stringify({'error': '404'});
      res.end(json);
    }
  }


  isEnabled() {
    return this.enabled;
  }


  private enable() {
    this.enabled = true;
    this.logger.info('Judge services started up:\n\t- ' + this.httpServer.url() + '\n\t- ' + this.httpsServer.url());
  }


  private disable() {
    this.enabled = false;
    this.logger.info('Judge services shutting down on:\n\t- ' + this.httpServer.url() + '\n\t- ' + this.httpsServer.url());
  }


  async handleRequest(ip: string, port: number, from: ProtocolType, to: ProtocolType): Promise<JudgeResult> {
    const proto_from = (from === ProtocolType.HTTP ? 'http' : 'https');
    const proto_to = (to === ProtocolType.HTTP ? 'http' : 'https');
    const url = proto_from + '://' + ip + ':' + port;
    const http_request = this.createRequest(proto_to, url);
    try {
      await http_request.performRequest();
    } catch (e) {
      this.logger.error('performRequest', e);
    }

    const result = http_request.result(from, to);
    this.removeFromCache(http_request.id);
    http_request.clear();

    this.logger.debug('judge: finished request (' + proto_from + '=>' + proto_to + ') ' + http_request.id +
      ' from ' + url + ' t=' + result.duration +
      ' error=' + result.hasError + ' (cached: ' + this.cache_sum + ')');
    return result;
  }


  async validate(ip: string, port: number, enable: { http: boolean, https: boolean } = {
    http: true,
    https: true
  }): Promise<JudgeResults> {
    const results: JudgeResults = new JudgeResults();
    results.host = ip;

    const domain = await DomainUtils.domainLookup(ip);
    ip = domain.addr;

    results.ip = ip;
    results.port = port;

    // Geo resolve
    results.geo = false;

    // const geo_url = FREEGEOIP + ip;
    // try {
    //   const response: IHttpResponse<any> = <IHttpResponse<any>>
    //     (await this.http.get(geo_url,
    //       {timeout: _.get(this.options, K_JUDGE_REQUEST_TIMEOUT, 10000)}));
    //   // let geodata: string = await _request.get(geo_url);
    //   if (response.body) {
    //     results.geo = true;
    //     // TODO use specific geo ip handler
    //     results.geoData = JSON.parse(response.body);
    //   }
    // } catch (e) {
    //   this.logger.error(e);
    // }

    const promises: Promise<any>[] = [];

    if (enable.http) {
      // HTTP => HTTP
      promises.push(this.handleRequest(ip, port, ProtocolType.HTTP, ProtocolType.HTTP).then(result => {
        results.variants.push(result);
      }).catch((error: Error) => {
        this.logger.error('http=>http', error);
      }));

      // HTTP => HTTPS
      promises.push(this.handleRequest(ip, port, ProtocolType.HTTP, ProtocolType.HTTPS).then(result => {
        results.variants.push(result);
      }).catch((error: Error) => {
        this.logger.error('http=>https', error);
      }));
    }

    if (enable.https) {
      // HTTPS => HTTP
      promises.push(this.handleRequest(ip, port, ProtocolType.HTTPS, ProtocolType.HTTP).then(result => {
        results.variants.push(result);
      }).catch((error: Error) => {
        this.logger.error('https=>http', error);
      }));

      // HTTPS => HTTPS
      promises.push(this.handleRequest(ip, port, ProtocolType.HTTPS, ProtocolType.HTTPS).then(result => {
        results.variants.push(result);
      }).catch((error: Error) => {
        this.logger.error('https=>https', error);
      }));
    }


    return Promise.all(promises).then(_res => {
      return results;
    });
  }


  private onSecureConnection(socket: tls.TLSSocket) {
    this.onServerConnection(socket);
  }


  private onServerConnection(socket: net.Socket) {
    const self = this;

    function onData(data: Buffer) {
      if (data[0] === 0x16 || data[0] === 0x80 || data[0] === 0x00) {
        return;
      }

      const tmp: Buffer = Buffer.allocUnsafe(data.length);
      data.copy(tmp);

      let receivedHead = tmp.toString('utf8');
      if (/\r\n\r\n/.test(receivedHead)) {
        receivedHead = receivedHead.split('\r\n\r\n').shift();
      }

      const headers = receivedHead.split(/\r\n/);
      const head = headers[0].split(/\s+/);
      const method = head.shift();
      const path = head.shift();
      const paths = path.split('/').filter((x) => {
        return x || x.length !== 0;
      });

      const first_path = paths.shift();
      let cached_req: JudgeRequest = null;

      if (first_path === 'judge' && paths.length === 1) {
        const req_id = paths.shift();
        if (self.cache[req_id]) {
          cached_req = self.cache[req_id];
        }

        if (cached_req && self.enabled) {
          // tslint:disable-next-line:no-shadowed-variable
          headers.forEach(function (head: any) {
            cached_req.monitor.addLog(MESSAGE.HED01.k, {header: head ? head : '_UNKNOWN_'}, '>>');
          });
        }
      }
    }

    socket.once('data', onData);
  }

  progressing() {
    return this.lock.await();
  }

  async wakeup(force: boolean = false): Promise<boolean> {
    if (this.isEnabled()) {
      return Promise.resolve(true);
    }

    await this.lock.acquire();
    let res = false;
    try {
      this.enable();
      await Promise.all([
        this.httpServer.start(),
        this.httpsServer.start()
      ]);
      res = true;
    } catch (e) {
      this.logger.error('judge-wakeup:', e);
      // throw e;
    } finally {
      this.lock.release(); // progress.ready();
    }
    return res;
  }


  async pending(): Promise<any> {
    if (!this.isEnabled()) {
      return Promise.resolve(true);
    }

    const cacheKeys = _.keys(this.cache);
    this.logger.debug('judge-pending: clear cache (entries: ' + cacheKeys.length + ')');
    cacheKeys.map(x => {
      this.cache[x].clear();
      this.removeFromCache(x);
    });

    await this.lock.acquire(); // progress.startWhenReady();
    let ret = false;
    try {
      this.disable();
      await Promise.all([
        this.httpServer.stop(),
        this.httpsServer.stop()
      ]);
      ret = true;
      this.logger.debug('judge-pending: finished');
    } catch (e) {
      this.logger.error('judge-pending:', e);
    } finally {
      this.lock.release();
    }
    return ret;

  }

  private throwedError(err: Error, ret?: any): any {
    this.logger.error(err);
    return ret;
  }


  // private info(...msg: any[]) {
  //   this.logger.info.apply(Log, msg);
  // }
  //
  //
  //
  //
  // private debug(...msg: any[]) {
  //   this.logger.debug.apply(Log, msg);
  // }
  //
  //
  // private trace(...msg: any[]) {
  //   this.logger.trace.apply(Log, msg);
  // }
}
