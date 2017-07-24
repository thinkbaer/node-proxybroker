import * as _ from 'lodash'
import * as tls from 'tls'
import * as http from 'http'
import * as net from 'net'
import * as url from "url";

import {Server} from "./Server";
import {DEFAULT_PROXY_SERVER_OPTIONS, IProxyServerOptions, K_PROXYSERVER} from "./IProxyServerOptions";

import {Runtime} from "../lib/Runtime";
import {IUrlBase} from "../lib/IUrlBase";
import {IpAddr} from "../model/IpAddr";
import TodoException from "../exceptions/TodoException";

import {ProtocolType} from "../lib/ProtocolType";
import {SocketHandle} from "./SocketHandle";
import {ProxyUsedEvent} from "../proxy/ProxyUsedEvent";
import {EventBus} from "../events/EventBus";
import {Log} from "../lib/logging/Log";


export class ProxyServer extends Server {


    _options: IProxyServerOptions;
    handles: SocketHandle[] = []

    // proxy: HttpProxy = null;

    constructor(options: IProxyServerOptions) {
        super(Object.assign({}, DEFAULT_PROXY_SERVER_OPTIONS, options))


        Runtime.$().setConfig(K_PROXYSERVER, this._options)
    }

    get level(): number {
        return this._options.level
    }

    get maxRepeats():number{
        return this._options.repeatLimit
    }


    onProxyRequest(handle: SocketHandle, req: http.IncomingMessage): void {
        this.debug('onProxyRequest ' + this._options.url + ' for ' + req.url);

        handle.removeHeader('Proxy-Select-Level');
        handle.removeHeader('Proxy-Select-Speed-Limit');
        handle.removeHeader('Proxy-Select-SSL');
        handle.removeHeader('Proxy-Select-Fallback');
        handle.removeHeader('Proxy-Select-Country');

        if (this.level == 3) {

            let sender_ip = req.socket.remoteAddress;
            let proxy_ip = req.socket.localAddress;
            let proxy_port = req.socket.localPort;

            handle.setHeader('X-Forwarded-For', sender_ip);
            handle.setHeader('Via', 'ProxyBroker on ' + proxy_ip + ':' + proxy_port);
            // proxyReq.setHeader('X-Via', 'ProxyBroker on ' + proxy_ip + ':' + proxy_port);
            //proxyReq.setHeader('X-Cache', 'Loader3');
            //proxyReq.setHeader('X-Cache-Lookup', 'MISSED');
            //proxyReq.setHeader('X-Client-IP', sender_ip);

        } else if (this.level == 2) {

            let proxy_ip = req.socket.localAddress;
            let proxy_port = req.socket.localPort;

            handle.setHeader('Via', 'ProxyBroker on ' + proxy_ip + ':' + proxy_port);
            //proxyReq.setHeader('X-Cache', 'Loader2');
            //proxyReq.setHeader('X-Cache-Lookup', 'MISSED');

        }
    }


    async getTarget(headers?: any): Promise<IUrlBase> {
        let _url: IUrlBase = null
        if (_.isString(this._options.target)) {
            let __url = url.parse(this._options.target)
            _url = {
                protocol: __url.protocol,
                hostname: __url.hostname,
                port: parseInt(__url.port)
            }
        } else if (_.isFunction(this._options.target)) {
            let t = await this._options.target(headers)
            if (t instanceof IpAddr) {
                // IpAddr
                _url = {
                    protocol: t['state'].protocol === ProtocolType.HTTP ? 'http' : 'https',
                    hostname: t.ip,
                    port: t.port
                }
            } else if (t['hostname'] && t['port'] && t['protocol']) {
                // UrlBase
                _url = <IUrlBase>t
            }
        }
        return Promise.resolve(_url)
    }




    private async handleUpstreamAfterFinishedRequest(reqHandle: SocketHandle, handle: SocketHandle, req: http.IncomingMessage, upstream: net.Socket, head: Buffer) {
        handle.debug('handleUpstreamAfterFinishedRequest finished=' + reqHandle.finished + ' error=' + handle.hasError())
        if (handle.hasError() && handle.hasSocketError()) {
            //if (!reqHandle.finished && !reqHandle.ended) {
            if (reqHandle.repeat < this.maxRepeats && this._options.toProxy) {
                reqHandle.repeat++
                await this.connectToExternProxy(true, reqHandle, req, null, upstream, head);
            } else {
                let data = JSON.stringify({error: handle.error, message: handle.error.message})
                upstream.write('HTTP/' + req.httpVersion + ' 504 Gateway Time-out\r\n' +
                    'Proxy-Broker-Error: ' + data + '\r\n' +
                    'Proxy-agent: Proxy-Broker' + '\r\n' +
                    'Proxy-Broker: Failed' + '\r\n' +
                    '\r\n',
                    (err: Error) => {
                        if (err) {
                            reqHandle.debug(err);
                        }
                        upstream.destroy()
                    });
            }

        } else {
            if (upstream && !upstream.destroyed) {
                upstream.destroy()
            }
        }
    }


    private async handleResponseAfterFinishedRequest(reqHandle: SocketHandle, handle: SocketHandle, req: http.IncomingMessage, res: http.ServerResponse) {
        handle.debug('handleResponseAfterFinishedRequest finished=' + reqHandle.finished + ' error=' + handle.hasError())

        if (handle.hasError()) {
            // Todo make this configurable
            if (reqHandle.repeat < this.maxRepeats && this._options.toProxy) {
                reqHandle.repeat++
                await this.connectToExternProxy(false, reqHandle, req, res);
            } else {
                let data = JSON.stringify({error: handle.error, message: handle.error.message})
                res.writeHead(504, 'Gateway Time-out', {
                    'Proxy-Broker-Error': data,
                    'Proxy-Broker': 'Failed',
                    'Proxy-agent': 'Proxy-Broker'
                })
                res.end()
            }
        } else {
            if (res && !res.finished) {
                res.end();
            }
        }
    }


    async onServerConnect(req: http.IncomingMessage, upstream: net.Socket, head: Buffer) {
        let self = this;
        let rurl: url.Url = url.parse(`https://${req.url}`);
        let proxy_url: IUrlBase = null
        let req_handle = this.getSocketHandle(req.socket)
        this.onProxyRequest(req_handle, req)
        this.debug('onServerConnect ' + this._options.url + ' url=' + rurl.href + ' handle=' + (req_handle ? req_handle.id : 'none'));

        if (this._options.toProxy && this._options.target) {
            await this.connectToExternProxy(true, req_handle, req, null,upstream,head);
        } else {

            proxy_url = {
                protocol: 'https',
                hostname: rurl.hostname,
                port: parseInt(rurl.port)
            };

            let downstream = net.connect(proxy_url.port, proxy_url.hostname, function () {
                self.debug('downstream connected to ' + req.url);
                upstream.write(
                    'HTTP/' + req.httpVersion + ' 200 Connection Established\r\n' +
                    'Proxy-agent: Proxybroker\r\n' +
                    '\r\n');
                downstream.write(head);
                downstream.pipe(upstream);
                upstream.pipe(downstream);
            });

            let handle = this.createSocketHandle(downstream)
            handle.onFinish()
                .then(handle => {
                    return self.handleUpstreamAfterFinishedRequest(req_handle, handle, req, upstream, head);
                })
                .catch(err => Log.error.bind(Log))
        }
    }

    async connectToExternProxy(ssl: boolean, reqHandle: SocketHandle, req: http.IncomingMessage, res?: http.ServerResponse, upstream?: net.Socket, head?: Buffer) {
        let self = this

        let proxy_url = await this.getTarget(req.headers)
        if (proxy_url) {
            let _str = proxy_url.protocol + '://' + proxy_url.hostname + ':' + proxy_url.port
            this.debug('proxing over proxy ' + _str + ' for url ' + req.url + ' (' + reqHandle.repeat + ')');

            let downstream: net.Socket = null
            if (ssl) {
                downstream = net.connect(proxy_url.port, proxy_url.hostname, function () {
                    self.debug('downstream over proxy connected to ' + req.url);
                    let conn_string = '' +
                        'CONNECT ' + req.url + ' HTTP/' + req.httpVersion + '\r\n' +
                        'Host: ' + req.url + '\r\n' +
                        '\r\n';
                    downstream.write(conn_string);
                    if(head){
                        downstream.write(head);
                    }

                    downstream.pipe(upstream);
                    upstream.pipe(downstream);
                });
            } else {
                downstream = net.connect(proxy_url.port, proxy_url.hostname, function () {
                    downstream.write(reqHandle.build());
                    downstream.pipe(req.socket)
                    req.socket.pipe(downstream)
                })

            }

            let handle = self.createSocketHandle(downstream, {timeout: 5000})
            handle.onFinish()
                .then(async handle => {
                    let p = null
                    if (ssl) {
                        p = self.handleUpstreamAfterFinishedRequest(reqHandle, handle, req, upstream, head)
                    } else {
                        p = self.handleResponseAfterFinishedRequest(reqHandle, handle, req, res)

                    }
                    await self.onProxyToProxy(proxy_url, handle);
                    return p
                })
                .catch(err => Log.error.bind(Log))

        } else {
            throw new TodoException('What should happen if no url is given? Define a fallback')
        }
    }

    async root(req: http.IncomingMessage, res: http.ServerResponse) {
        let self = this

        let req_handle = this.getSocketHandle(req.socket)
        this.debug('proxyResponse ' + this._options.url + ' RH:' + (req_handle ? req_handle.id : 'none'));

        // TODO request handle must be present
        this.onProxyRequest(req_handle, req)

        if (this._options.toProxy && this._options.target) {
            await this.connectToExternProxy(false, req_handle, req, res);
        } else {
            let _req_url = req.url.replace(/^\//, '')
            let _url = url.parse(_req_url);

            req.url = _req_url

            // TODO generic filter
            if (!_url.port) {
                _url.port = "80"
                if (_url.protocol === 'https:') {
                    _url.port = "443"
                }
            }

            this.debug('proxing url ' + this._options.url + ' url=' + req.url + ' ssl='+req_handle.options.ssl);

            let downstream = net.connect(parseInt(_url.port), _url.hostname, function () {
                downstream.write(req_handle.build())
                //req.pipe(downstream)
                downstream.pipe(req.socket)
                req.socket.pipe(downstream)
            })

            let handle = this.createSocketHandle(downstream)
            handle.onFinish().then(handle => {
                return self.handleResponseAfterFinishedRequest(req_handle, handle, req, res);
            }).catch(err => Log.error.bind(Log))
        }
    }

    onServerClientError(exception: Error, socket: net.Socket): void {
        this.debug('onServerClientError ' + this._options.url, exception)
        socket.destroy(exception)
    }


    async onSecureConnection(socket: tls.TLSSocket): Promise<void> {
        this.debug('onSecureConnection ' + this._options.url)
        this.createSocketHandle(socket, {ssl: true, timeout: 30000})
        return Promise.resolve()
    }


    async onServerConnection(socket: net.Socket): Promise<void> {
        this.debug('onServerConnection ' + this._options.url)
        this.createSocketHandle(socket, {ssl: false, timeout: 30000})
        return Promise.resolve()
    }


    private createSocketHandle(socket: net.Socket, opts: { ssl?: boolean, timeout?: number } = {
        ssl: false,
        timeout: 30000
    }): SocketHandle {
        let handle = new SocketHandle(socket, opts);
        this.handles.push(handle);
        this.debug('createSocketHandle ' + handle.id)
        let self = this
        handle.onFinish().then(handle => {
            _.remove(self.handles, (x: SocketHandle) => {
                return x.id === handle.id;
            });

            if (self.handles.length == 0) {
                self.server.emit('empty handles')
            }
        });

        return handle
    }


    private getSocketHandle(socket: net.Socket): SocketHandle {
        return _.find(this.handles, {id: socket['handle_id']})
    }


    async onProxyToProxy(base: IUrlBase, handle: SocketHandle): Promise<any> {
        let e = new ProxyUsedEvent(base, handle)
        return EventBus.post(e);
    }


    preFinalize(): Promise<void> {
        if (this.handles.length > 0) {
            let self = this
            return new Promise(resolve => {
                self.server.once('empty handles', resolve)
            })
        }
        return Promise.resolve()
    }

}