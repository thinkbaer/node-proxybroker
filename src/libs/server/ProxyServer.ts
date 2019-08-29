import * as _ from 'lodash';
import * as tls from 'tls';
import * as http from 'http';
import * as net from 'net';
import * as url from 'url';

import {DEFAULT_PROXY_SERVER_OPTIONS, IProxyServerOptions} from './IProxyServerOptions';
import {SocketHandle} from './SocketHandle';
import {IRoute, IServer, Server} from '@typexs/server';
import {Container, IHttpHeaders, IUrlBase, Log, TodoException} from '@typexs/base';
import {ProtocolType} from '../specific/ProtocolType';
import {IpAddr} from '../../entities/IpAddr';
import {HttpHeaderTransform} from './HttpHeaderTransform';
import {
  E_EMPTY_SOCKET_HANDLES,
  HEADER_KEY_PROXY_AGENT,
  HEADER_KEY_PROXY_BROKER,
  HEADER_KEY_PROXY_BROKER_ERROR,
  HEADER_KEY_PROXY_SELECT_COUNTRY,
  HEADER_KEY_PROXY_SELECT_FALLBACK,
  HEADER_KEY_PROXY_SELECT_LEVEL,
  HEADER_KEY_PROXY_SELECT_PROXY,
  HEADER_KEY_PROXY_SELECT_SPEED_LIMIT,
  HEADER_KEY_PROXY_SELECT_SSL,
  HEADER_KEY_PROXY_VIA,
  HEADER_KEY_PROXY_X_FORWARDED_FOR,
  REGEX
} from '../Constants';
import {PROXY_ROTATOR_SERVICE} from '../proxy/IProxyRotator';
import {ProxyUsed} from '../proxy/ProxyUsed';
import {IProxySelector} from '../proxy/IProxySelector';
import {NetworkHelper} from './NetworkHelper';

/**
 * ProxyServer implementation
 */
export class ProxyServer extends Server implements IServer {


  get level(): number {
    return this._options.level;
  }


  get maxRepeats(): number {
    return this._options.repeatLimit;
  }

  /**
   * Name of server instance
   */
  name: string;

  /**
   * Options
   */
  _options: IProxyServerOptions;

  /**
   * Store of active socket connections in special handle
   */
  handles: SocketHandle[] = [];


  static packErrorMessage(error: Error) {
    return JSON.stringify({error: error, message: error.message});
  }

  static errorResponse(error: Error, res: http.ServerResponse) {
    const headers: IHttpHeaders = {};
    headers[HEADER_KEY_PROXY_BROKER] = 'Failed';
    headers[HEADER_KEY_PROXY_BROKER_ERROR] = this.packErrorMessage(error);
    headers[HEADER_KEY_PROXY_AGENT] = 'Proxy-Broker';
    res.writeHead(504, 'Gateway Time-out', headers);
    res.end();
  }

  static errorUpstream(error: Error,
                       upstream: net.Socket,
                       request: http.IncomingMessage, requestHandle: SocketHandle) {
    const data = this.packErrorMessage(error);
    const headers: IHttpHeaders = {};
    headers[HEADER_KEY_PROXY_BROKER] = 'Failed';
    headers[HEADER_KEY_PROXY_BROKER_ERROR] = this.packErrorMessage(error);
    headers[HEADER_KEY_PROXY_AGENT] = 'Proxy-Broker';

    const output = _.keys(headers).map(k => k + ': ' + headers[k]).join('\r\n');
    upstream.write('HTTP/' + request.httpVersion + ' 504 Gateway Time-out\r\n' +
      output + '\r\n' +
      '\r\n',
      (err: Error) => {
        if (err) {
          requestHandle.debug(err);
        }
        upstream.end();
      });
  }


  initialize(options: IProxyServerOptions): void {
    _.defaultsDeep(options, DEFAULT_PROXY_SERVER_OPTIONS);
    options.logger = _.get(options, 'logger', Log.getLoggerFor(ProxyServer));

    if (options.toProxy && !options.target) {
      try {
        const rotator = Container.get(PROXY_ROTATOR_SERVICE);
        options.target = rotator.next.bind(rotator);
        options.proxyLog = rotator.log.bind(rotator);
      } catch (e) {
        options.logger.error('Downgrade to direct proxy cause rotator can\'t be initialized.');
        // disable
        options.toProxy = false;
      }
    }
    super.initialize(options);
  }


  getLogger() {
    return this.options().logger;
  }


  options(): IProxyServerOptions {
    return <IProxyServerOptions>this._options;
  }


  hasRoutes(): boolean {
    return false; // throw new Error("Method not implemented.");
  }


  getRoutes(): IRoute[] {
    throw new Error('Method not implemented.');
  }


  getUri() {
    const o = this.options();
    return o.protocol + '://' + o.ip + (o.port ? ':' + o.port : '');
  }


  onProxyRequest(handle: SocketHandle, req: http.IncomingMessage): void {
    const targetProxy = _.get(req.headers, HEADER_KEY_PROXY_SELECT_PROXY.toLowerCase(), null);
    this.debug('onProxyRequest ' + handle.id + ' ' + this.url() + ' for ' + req.url +
      ' (Level: ' + this.level + ')' + (targetProxy ? ' targetProxy=' + targetProxy : ''));

    handle.removeHeader(HEADER_KEY_PROXY_SELECT_LEVEL);
    handle.removeHeader(HEADER_KEY_PROXY_SELECT_SPEED_LIMIT);
    handle.removeHeader(HEADER_KEY_PROXY_SELECT_SSL);
    handle.removeHeader(HEADER_KEY_PROXY_SELECT_FALLBACK);
    handle.removeHeader(HEADER_KEY_PROXY_SELECT_COUNTRY);
    handle.removeHeader(HEADER_KEY_PROXY_SELECT_PROXY);

    if (this.level === 3) {
      const sender_ip = req.socket.remoteAddress;
      const proxy_ip = req.socket.localAddress;
      const proxy_port = req.socket.localPort;
      handle.setHeader(HEADER_KEY_PROXY_X_FORWARDED_FOR, sender_ip);
      handle.setHeader(HEADER_KEY_PROXY_VIA, 'ProxyBroker on ' + proxy_ip + ':' + proxy_port);
    } else if (this.level === 2) {
      const proxy_ip = req.socket.localAddress;
      const proxy_port = req.socket.localPort;
      handle.setHeader(HEADER_KEY_PROXY_VIA, 'ProxyBroker on ' + proxy_ip + ':' + proxy_port);
    }
  }


  async getTarget(headers?: any): Promise<IUrlBase> {
    let proxyUrl: IUrlBase = null;
    const header_key = HEADER_KEY_PROXY_SELECT_PROXY.toLowerCase();
    if (_.has(headers, header_key) && REGEX.test(headers[header_key])) {
      const __url = url.parse(headers[header_key]);
      proxyUrl = {
        protocol: __url.protocol.replace(':', ''),
        hostname: __url.hostname,
        port: parseInt(__url.port, 0)
      };
    } else if (_.isString(this._options.target)) {
      const __url = url.parse(this._options.target);
      proxyUrl = {
        protocol: __url.protocol.replace(':', ''),
        hostname: __url.hostname,
        port: parseInt(__url.port, 0)
      };
    } else if (_.isFunction(this._options.target)) {
      const selector: IProxySelector = _.clone(headers);
      const t = await this._options.target(selector);
      if (t instanceof IpAddr) {
        // IpAddr
        proxyUrl = {
          protocol: t['state'].protocol_src === ProtocolType.HTTP ? 'http' : 'https',
          hostname: t.ip,
          port: t.port
        };
      } else if (t['hostname'] && t['port'] && t['protocol']) {
        // UrlBase
        proxyUrl = <IUrlBase>t;
      }
    }
    return Promise.resolve(proxyUrl);
  }


  private hasFallbackHeader(reqHandle: SocketHandle): boolean {
    const res = _.find(reqHandle.headersList, {key: HEADER_KEY_PROXY_SELECT_FALLBACK.toLowerCase()});
    if (res && res.value) {
      return true;
    }
    return false;
  }


  private handleUpstreamAfterFinishedRequest(requestHandle: SocketHandle,
                                             handle: SocketHandle,
                                             request: http.IncomingMessage,
                                             upstream: net.Socket,
                                             head: Buffer) {
    // handle.debug('handleUpstreamAfterFinishedRequest finished=' + requestHandle.finished + ' error=' + handle.hasError());

    if (handle.hasError() && handle.hasSocketError()) {
      const checkRepeats = this._options.toProxy && !this.hasSelectedProxy(request);
      if (requestHandle.meta.repeat < this.maxRepeats && checkRepeats) {
        requestHandle.meta.repeat++;
        return this.connectToExternProxy(true, requestHandle, request, null, upstream, head);
      } else if (requestHandle.meta.repeat >= this.maxRepeats && checkRepeats && this.hasFallbackHeader(requestHandle)) {
        return this.onServerConnect(request, upstream, head, true);
      } else {
        ProxyServer.errorUpstream(handle.error, upstream, request, requestHandle);
      }

    } else {
      if (upstream && !upstream.destroyed) {
        upstream.end();
      }
    }
    return null;
  }

  private hasSelectedProxy(request: http.IncomingMessage) {
    return _.has(request.headers, HEADER_KEY_PROXY_SELECT_PROXY.toLowerCase());
  }


  private async handleResponseAfterFinishedRequest(reqHandle: SocketHandle,
                                                   handle: SocketHandle,
                                                   req: http.IncomingMessage,
                                                   res: http.ServerResponse) {
    // handle.debug('handleResponseAfterFinishedRequest finished=' + reqHandle.finished + ' error=' + handle.hasError());
    if (handle.hasError()) {
      // Todo make this configurable
      const checkRepeats = this._options.toProxy && !this.hasSelectedProxy(req);
      if (reqHandle.meta.repeat < this.maxRepeats && checkRepeats) {
        reqHandle.meta.repeat++;
        await this.connectToExternProxy(false, reqHandle, req, res);
      } else if (reqHandle.meta.repeat >= this.maxRepeats &&
        checkRepeats && this.hasFallbackHeader(reqHandle)) {
        await this.root(req, res, true);
      } else {
        ProxyServer.errorResponse(handle.error, res);
      }
    } else {
      if (res && !res.finished) {
        res.destroy();
      }
    }
  }


  async connectToExternProxy(ssl: boolean,
                             requestHandle: SocketHandle,
                             request: http.IncomingMessage,
                             response?: http.ServerResponse,
                             upstream?: net.Socket,
                             head?: Buffer) {

    const selector = _.clone(request.headers) as IProxySelector;
    selector.targetSSL = ssl;
    let proxyUrl = null;
    try {
      proxyUrl = await this.getTarget(selector);
    } catch (e) {
      if (ssl) {
        ProxyServer.errorUpstream(e, upstream, request, requestHandle);
      } else {
        ProxyServer.errorResponse(e, response);
      }
      return;
    }

    if (proxyUrl) {
      const proxyUrlStr = proxyUrl.protocol + '://' + proxyUrl.hostname + ':' + proxyUrl.port;
      this.debug('proxing over proxy ' + proxyUrlStr + ' for url ' +
        (ssl ? 'https://' : 'http://') + request.url + ' (' + requestHandle.meta.repeat + ')');
      // ssl = ssl || proxyUrl.protocol === 'https';
      let downstream: net.Socket = null;
      if (ssl) {
        const connectStr = '' +
          'CONNECT ' + request.url + ' HTTP/' + request.httpVersion + '\r\n' +
          'Host: ' + request.url + '\r\n' +
          '\r\n';
        downstream = NetworkHelper.pipeConnection(proxyUrl, upstream, connectStr, {logger: this.getLogger()});
      } else {
        const buffer = requestHandle.build();
        downstream = NetworkHelper.pipeConnection(proxyUrl, request.socket, buffer, {logger: this.getLogger()});
      }

      const handle = this.createSocketHandle(downstream, {timeout: this.options().broker.timeouts.forward, ssl: ssl, url: request.url});
      await handle.onFinish();
      try {
        await this.doStateLog(proxyUrl, handle);
        if (ssl) {
          await this.handleUpstreamAfterFinishedRequest(requestHandle, handle, request, upstream, head);
        } else {
          await this.handleResponseAfterFinishedRequest(requestHandle, handle, request, response);
        }
      } catch (err) {
        this.getLogger().error(err);
      }
    } else {
      throw new TodoException('What should happen if no url is given? Define a fallback');
    }
  }


  url() {
    return super.url();
  }

  /**
   * Getting CONNECT request from client
   *
   * @param request
   * @param upstream
   * @param head
   * @param disable_proxy_to_proxy
   */
  async onServerConnect(request: http.IncomingMessage,
                        upstream: net.Socket,
                        head: Buffer,
                        disable_proxy_to_proxy: boolean = false) {

    const requestHandle = this.getSocketHandle(request.socket);
    this.onProxyRequest(requestHandle, request);
    this.debug('onServerConnect [' + (requestHandle ? requestHandle.id : 'none') + '] ' +
      this.url() + ' url=' + request.url + ' handle=' + (requestHandle ? requestHandle.id : 'none'));
    if (this._options.toProxy && this._options.target && !disable_proxy_to_proxy) {
      await this.connectToExternProxy(true, requestHandle, request, null, upstream, head);
    } else {
      const rurl: url.Url = url.parse(`http://${request.url}`);
      const proxy_url: any = {
        hostname: rurl.hostname,
        port: parseInt(rurl.port, 0)
      };

      const upTransform = new HttpHeaderTransform({headers: requestHandle.getHeaders()});
      const downstream = net.connect(proxy_url.port, proxy_url.hostname, () => {
        this.debug('onServerConnect [' + requestHandle.id + ']: downstream connected to ' + request.url);
        upstream.write(
          'HTTP/' + request.httpVersion + ' 200 Connection Established\r\n' +
          HEADER_KEY_PROXY_AGENT + ': Proxybroker\r\n' +
          '\r\n', err => {
            if (err) {
              this.getLogger().error(err);
            }
          });
        upstream.pipe(upTransform).pipe(downstream);
        downstream.pipe(upstream);
      });

      // TODO add timeout if proxyserver is not a used as broker
      const handle = this.createSocketHandle(downstream, {ssl: true, url: request.url});
      try {
        await handle.onFinish();
        await this.handleUpstreamAfterFinishedRequest(requestHandle, handle, request, upstream, head);
      } catch (err) {
        this.getLogger().error(err);
      }
    }
  }


  onServerClientError(exception: Error, socket: net.Socket): void {
    super.onServerClientError(exception, socket);
  }


  async root(request: http.IncomingMessage,
             response: http.ServerResponse,
             disable_proxy_to_proxy: boolean = false) {

    const requestHandle = this.getSocketHandle(request.socket);
    this.debug('proxyResponse ' + this.url() + ';  requestHandle.id:' + (requestHandle ? requestHandle.id : 'none'));

    if (!requestHandle) {
      return ProxyServer.errorResponse(new Error('Can\'t establish connection.'), response);
    }

    // TODO request handle must be present
    this.onProxyRequest(requestHandle, request);

    if (this._options.toProxy && this._options.target && !disable_proxy_to_proxy) {
      await this.connectToExternProxy(false, requestHandle, request, response);
    } else {
      const _req_url = request.url.replace(/^\//, '');
      const _url = url.parse(_req_url);

      request.url = _req_url;

      // TODO generic filter
      if (!_url.port) {
        _url.port = '80';
        if (_url.protocol === 'https:') {
          _url.port = '443';
        }
      }

      this.debug('proxing over url ' + this.url() + '; url=' + request.url + '; ssl=' + requestHandle.options.ssl);
      const req_buf = requestHandle.build();
      const downstream = NetworkHelper.pipeConnection({
        protocol: _url.protocol,
        hostname: _url.hostname,
        port: parseInt(_url.port, 0)
      }, request.socket, req_buf, {logger: this.getLogger()});

      const handle = this.createSocketHandle(downstream, {timeout: this.options().broker.timeouts.incoming, url: request.url});
      try {
        await handle.onFinish();
        await this.handleResponseAfterFinishedRequest(requestHandle, handle, request, response);
      } catch (err) {
        this.getLogger().error(err);
      }
    }
  }


  onServerConnection(socket: net.Socket | tls.TLSSocket, secured: boolean = false) {
    super.onServerConnection(socket);
    this.debug('onServerConnection(' + secured + ') ' + this.url());
    this.createSocketHandle(socket, {ssl: secured, timeout: this.options().broker.timeouts.incoming});
  }


  private createSocketHandle(socket: net.Socket, opts: { ssl?: boolean, timeout?: number, url?: string } = {}): SocketHandle {
    opts = _.defaults(opts, {
      ssl: false,
      timeout: 10000,
    });
    const handle = new SocketHandle(socket, opts);
    handle.meta.repeat = 0;

    this.handles.push(handle);
    this.debug('create socketHandle.id=' + handle.id);
    // tslint:disable-next-line:no-shadowed-variable
    handle.onFinish().then((handle: SocketHandle) => {
      this.debug('onFinished socketHandle.id=' + handle.id);
      this.removeHandle(handle);
    });
    return handle;
  }


  removeHandle(handle: SocketHandle) {
    _.remove(this.handles, (x: SocketHandle) => {
      return x.id === handle.id;
    });
    if (this.handles.length === 0) {
      this.server.emit(E_EMPTY_SOCKET_HANDLES);
    }
  }


  private getSocketHandle(socket: net.Socket): SocketHandle {
    return _.find(this.handles, x => x.id === socket['handle_id']);
  }


  doStateLog(base: IUrlBase, handle: SocketHandle): Promise<any> {
    this.debug('doStateLog: ' + base.protocol + '://' + base.hostname + ':' + base.port +
      ' socketHandle.id=' + handle.id + ' dest=' + handle.url());
    if (this._options.proxyLog) {
      const proxyUsed = new ProxyUsed(base, handle);
      return this._options.proxyLog(proxyUsed);
    }
    return Promise.resolve();
  }


  preFinalize(): Promise<void> {
    this.debug('preFinalize: handles ' + this.handles.length);
    if (this.handles.length > 0) {
      const timer = setTimeout(() => {
        while (this.handles.length > 0) {
          const handle = this.handles.shift();
          handle.finish();
        }
        this.server.emit(E_EMPTY_SOCKET_HANDLES);
      }, 500);
      return new Promise(resolve => {
        this.server.once(E_EMPTY_SOCKET_HANDLES, () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    return Promise.resolve();
  }


  /**
   * Needed for checkFunction in ServerFactory
   */
  prepare() {
    super.prepare();
  }


  /**
   * Needed for checkFunction in ServerFactory
   */
  start() {
    return super.start();
  }


  /**
   * Needed for checkFunction in ServerFactory
   */
  stop() {
    return super.stop();
  }


  debug(...msg: any[]): void {
    this.getLogger().debug(...msg);
  }
}
