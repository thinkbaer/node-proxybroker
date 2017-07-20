import * as _ from 'lodash'

import * as http from 'http'
import * as net from 'net'
import * as url from "url";

import * as HttpProxy from "http-proxy"

import {Server} from "./Server";
import {DEFAULT_PROXY_SERVER_OPTIONS, IProxyServerOptions} from "./IProxyServerOptions";

import {Runtime} from "../lib/Runtime";
import {IUrlBase} from "../lib/IUrlBase";
import {IpAddr} from "../model/IpAddr";
import TodoException from "../exceptions/TodoException";

import {ProtocolType} from "../lib/ProtocolType";
import {SocketHandle} from "./SocketHandle";


export class ProxyServer extends Server {


    _options: IProxyServerOptions;
    handles: SocketHandle[] = []

    // proxy: HttpProxy = null;

    constructor(options: IProxyServerOptions) {
        super(Object.assign({}, DEFAULT_PROXY_SERVER_OPTIONS, options))


        Runtime.$().setConfig('proxyserver', this._options)
    }

    get level(): number {
        return this._options.level
    }


    onProxyRequest(handle: SocketHandle, req: http.IncomingMessage): void {
        this.debug('onProxyRequest ' + this._options.url + ' for ' + req.url);

        handle.removeHeader('Proxy-Select-Level')
        handle.removeHeader('Proxy-Select-Speed-Limit')
        handle.removeHeader('Proxy-Select-SSL')
        handle.removeHeader('Proxy-Select-Fallback')
        handle.removeHeader('Proxy-Select-Country')

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
                host: __url.hostname,
                port: parseInt(__url.port)
            }
        } else if (_.isFunction(this._options.target)) {
            let t = await this._options.target(headers)
            if (t instanceof IpAddr) {
                // IpAddr
                _url = {
                    protocol: t['state'].protocol === ProtocolType.HTTP ? 'http' : 'https',
                    host: t.ip,
                    port: t.port
                }
            } else if (t['host'] && t['port'] && t['protocol']) {
                // UrlBase
                _url = <IUrlBase>t
            }
        }
        return Promise.resolve(_url)
    }


    private handleUpstreamAfterFinishedRequest(reqHandle: SocketHandle, handle: SocketHandle, req: http.IncomingMessage, upstream: net.Socket) {
        if (handle.hasError() && handle.hasSocketError()) {
            if (!reqHandle.finished && !reqHandle.ended) {
                let data = JSON.stringify({error: handle.error, message: handle.error.message})

                upstream.write('HTTP/' + req.httpVersion + ' 504 Gateway Time-out\r\n' +
                    'Content-Length: ' + data.length + '\r\n' +
                    'Proxy-agent: ProxyBroker\r\n' +
                    '\r\n' +
                    data, (err: Error) => {
                    reqHandle.debug(err)
                    upstream.destroy()
                });
            }
        }else{
            upstream.destroy()
        }
    }

    private handleResponseAfterFinishedRequest(req: SocketHandle, handle: SocketHandle, res: http.ServerResponse) {
        if (handle.hasError()) {
            if (!req.finished) {
                res.writeHead(504, 'Gateway Time-out')
                res.write(JSON.stringify(handle.error), (err: Error) => {
                    req.debug(err)
                    res.end()
                })
            }
        }else{
            res['connection'].destroy()
        }
    }

    async onServerConnect(req: http.IncomingMessage, upstream: net.Socket, head: Buffer) {
        let self = this;
        let rurl: url.Url = url.parse(`https://${req.url}`);
        let proxy_url: IUrlBase = null
        let req_handle = this.getSocketHandle(req.socket)
        this.onProxyRequest(req_handle, req)
        this.debug('onServerConnect ' + this._options.url + ' url=' + rurl.href + ' handle=' + (req_handle ? req_handle.id : 'none'));

        /*
                upstream['_finished'] = false
                upstream.on('close',function(){
                    upstream['_finished'] = true
                })
                upstream.on('error',function(){
                    upstream['_finished'] = true
                })
        */
        if (this._options.toProxy && this._options.target) {
            proxy_url = await self.getTarget(req.headers)

            if (proxy_url) {
                let downstream = net.connect(proxy_url.port, proxy_url.host, function () {
                    self.debug('downstream over proxy connected to ' + req.url);
                    let conn_string = '' +
                        'CONNECT ' + req.url + ' HTTP/' + req.httpVersion + '\r\n' +
                        'Host: ' + req.url + '\r\n' +
                        '\r\n';
                    downstream.write(conn_string);
                    downstream.write(head);
                    downstream.pipe(upstream);
                    upstream.pipe(downstream);
                });

                let handle = this.createSocketHandle(downstream)
                handle.onFinish()
                    .then(handle => {
                        self.handleUpstreamAfterFinishedRequest(req_handle, handle, req, upstream);
                        self.onProxyToProxy(proxy_url, handle);
                    })
            } else {
                throw new TodoException('What should happen if no url is given? Define a fallback');
            }
        } else {

            proxy_url = {
                protocol: 'https',
                host: rurl.hostname,
                port: parseInt(rurl.port)
            };

            let downstream = net.connect(proxy_url.port, proxy_url.host, function () {
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
                    self.handleUpstreamAfterFinishedRequest(req_handle, handle, req, upstream);
                })
                .catch((err) => {
                    self.debug(err)
                })
        }
    }


    async root(req: http.IncomingMessage, res: http.ServerResponse) {
        let proxy_url: IUrlBase = null
        let self = this

        let req_handle = this.getSocketHandle(req.socket)
        this.debug('proxyResponse ' + this._options.url + ' RH:' + (req_handle ? req_handle.id : 'none'));

        // TODO request handle must be present
        this.onProxyRequest(req_handle, req)

        if (this._options.toProxy && this._options.target) {
            proxy_url = await this.getTarget(req.headers)

            let _str = proxy_url.protocol + '://' + proxy_url.host + ':' + proxy_url.port
            if (proxy_url) {
                this.debug('proxing over proxy ' + _str + ' for url ' + req.url);
                let opts = {
                    target: _str,
                    toProxy: true,
                    proxyTimeout: 5000
                }


                let downstream = net.connect(proxy_url.port, proxy_url.host, function () {
                    downstream.write(req_handle.build());
                    downstream.pipe(req.socket)
                })

                let handle = self.createSocketHandle(downstream)
                handle.onFinish()
                    .then(handle => {
                        self.handleResponseAfterFinishedRequest(req_handle, handle, res);
                        self.onProxyToProxy(proxy_url, handle);
                    })

            } else {
                throw new TodoException('What should happen if no url is given? Define a fallback')
            }

        } else {
            let _req_url = req.url.replace(/^\//, '')
            let _url = url.parse(_req_url);

            req.url = _req_url

            let opts = {
                target: _url.protocol + '//' + _url.host,
                proxyTimeout: 5000
            }

            // TODO generic filter
            if (!_url.port) {
                _url.port = "80"
                if (_url.protocol === 'https:') {
                    _url.port = "443"
                } else {

                }
            }


            this.debug('proxing url ' + this._options.url, req.url);
            let downstream = net.connect(parseInt(_url.port), _url.host, function () {
                downstream.write(req_handle.build())
                //req.pipe(downstream)
                downstream.pipe(req.socket)
            })
            let handle = this.createSocketHandle(downstream)
            handle.onFinish().then(handle => {
                self.handleResponseAfterFinishedRequest(req_handle, handle, res);
            })
        }
    }

    onServerClientError(exception: Error, socket: net.Socket): void {
        this.debug('onServerClientError ' + this._options.url, exception)
        socket.destroy(exception)
    }


    async onServerConnection(socket: net.Socket): Promise<void> {
        this.debug('onServerConnection ' + this._options.url)

        this.createSocketHandle(socket)
        return Promise.resolve()
    }


    private createSocketHandle(socket: net.Socket): SocketHandle {
        let handle = new SocketHandle(socket);
        this.debug('createSocketHandle ' + handle.id)
        this.handles.push(handle);
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

    async onProxyToProxy(base: IUrlBase, handle: SocketHandle): Promise<void> {
        if (handle.hasError()) {

        } else {

        }
        return null
    }

    prepare() {
        /*
        this.proxy = HttpProxy.createProxyServer({});
        this.proxy.on('proxyReq', this.onProxyRequest.bind(this));
        this.proxy.on('proxyRes', this.onProxyResponse.bind(this));
        this.proxy.on('error', this.onProxyError.bind(this));
        this.proxy.on('open', this.onProxySocketOpen.bind(this));
        this.proxy.on('close', this.onProxySocketClose.bind(this))
        */
    }


    finalize() {
        /*
        if (this.proxy) {
            this.proxy.close()
        }
        */
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