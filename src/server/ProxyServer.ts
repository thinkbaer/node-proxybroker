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
    proxy: HttpProxy = null;

    constructor(options: IProxyServerOptions) {
        super(Object.assign({}, DEFAULT_PROXY_SERVER_OPTIONS, options))


        Runtime.$().setConfig('proxyserver', this._options)
    }

    get level(): number {
        return this._options.level
    }


    onProxyRequest(proxyReq: http.ClientRequest, req: http.IncomingMessage, res: http.ServerResponse, options: HttpProxy.ServerOptions): void {
        this.debug('onProxyRequest ' + this._options.url + ' for ' + req.url);

        proxyReq.removeHeader('Proxy-Select-Level')
        proxyReq.removeHeader('Proxy-Select-Speed-Limit')
        proxyReq.removeHeader('Proxy-Select-SSL')
        proxyReq.removeHeader('Proxy-Select-Fallback')
        proxyReq.removeHeader('Proxy-Select-Country')

        if (this.level == 3) {

            let sender_ip = req.socket.remoteAddress;
            let proxy_ip = req.socket.localAddress;
            let proxy_port = req.socket.localPort;

            proxyReq.setHeader('X-Forwarded-For', sender_ip);
            proxyReq.setHeader('Via', 'ProxyBroker on ' + proxy_ip + ':' + proxy_port);
            // proxyReq.setHeader('X-Via', 'ProxyBroker on ' + proxy_ip + ':' + proxy_port);
            //proxyReq.setHeader('X-Cache', 'Loader3');
            //proxyReq.setHeader('X-Cache-Lookup', 'MISSED');
            //proxyReq.setHeader('X-Client-IP', sender_ip);

        } else if (this.level == 2) {

            let proxy_ip = req.socket.localAddress;
            let proxy_port = req.socket.localPort;

            proxyReq.setHeader('Via', 'ProxyBroker on ' + proxy_ip + ':' + proxy_port);
            //proxyReq.setHeader('X-Cache', 'Loader2');
            //proxyReq.setHeader('X-Cache-Lookup', 'MISSED');

        }
    }

    onProxyResponse(proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse): void {
        this.debug('onProxyResponse ' + this._options.url)
    }

    onProxyError(err: Error, req: http.IncomingMessage, res: http.ServerResponse): void {
        this.debug('onProxyError ' + this._options.url, err)

        res.writeHead(400, {"Content-Type": "text/html"});
        res.end(err.message)


    }

    onProxySocketOpen(proxySocket: net.Socket): void {
        this.debug('onProxySocketOpen ' + this._options.url)
    }

    onProxySocketClose(proxyRes: http.IncomingMessage, proxySocket: net.Socket, proxyHead: any): void {
        this.debug('onProxySocketClose ' + this._options.url)
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


    async onServerConnect(request: http.IncomingMessage, upstream: net.Socket, head: Buffer) {
        this.debug('onServerConnect ' + this._options.url);
        let self = this;
        let rurl: url.Url = url.parse(`https://${request.url}`);
        let proxy_url: IUrlBase = null

        if (this._options.toProxy && this._options.target) {
            proxy_url = await self.getTarget(request.headers)

            if (proxy_url) {
                let downstream = net.connect(proxy_url.port, proxy_url.host, function () {
                    self.debug('downstream connected to ' + request.url);
                    let conn_string = '' +
                        'CONNECT ' + request.url + ' HTTP/' + request.httpVersion + '\r\n' +
                        'Host: ' + request.url + '\r\n' +
                        '\r\n';
                    downstream.write(conn_string);
                    downstream.write(head);
                    downstream.pipe(upstream);
                    upstream.pipe(downstream);
                });

                let handle = new SocketHandle(downstream)

                handle.onFinish()
                    .then(handle => {
                        if(handle.statusCode >= 400){
                            // some error
                            // upstream.write(handle.data)
                            upstream.destroy()
                        }else{
                            // nothing to do
                            self.debug('test')
                        }
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
                self.debug('downstream connected to ' + request.url);
                upstream.write(
                    'HTTP/' + request.httpVersion + ' 200 Connection Established\r\n' +
                    'Proxy-agent: Proxybroker\r\n' +
                    '\r\n');
                downstream.write(head);
                downstream.pipe(upstream);
                upstream.pipe(downstream);
            });

            let handle = new SocketHandle(downstream)
            handle.onFinish()
                .then(handle => {

                    if (handle.error) {
                        self.debug('Downstream finished with error on ' + self._options.url, proxy_url, handle.error)
                        let data = JSON.stringify({error: handle.error, message: handle.error.message})

                        upstream.write('HTTP/' + request.httpVersion + ' 400 Bad Request\r\n' +
                            'Content-Length: ' + data.length + '\r\n' +
                            'Proxy-agent: Proxybroker\r\n' +
                            '\r\n');

                        upstream.write(data + '\r\n\n');
                        upstream.destroy()
                    } else {
                        self.debug('Downstream finished on ' + self._options.url, proxy_url)
                    }
                })
                .catch((err) => {
                    self.debug(err)
                })
        }
    }


    onSocketClose(urlStr: IUrlBase, start: Date, error: boolean) {
        let now = (new Date())
        let duration = now.getTime() - start.getTime()

        this.debug('closed!!!' + urlStr.protocol + '://' + urlStr.host + ':' + urlStr.port + ' '
            + start.getTime() + ' ' + (new Date()).getTime() + ' dur=' + duration + ' err=' + error)

    }

    onServerClientError(exception: Error, socket: net.Socket): void {
        this.debug('onServerClientError ' + this._options.url,exception)
        socket.destroy(exception)
    }


    async root(req: http.IncomingMessage, res: http.ServerResponse) {
        this.debug('proxyResponse ' + this._options.url);
        let proxy_url: IUrlBase = null
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

                res['connection'].on('close', this.onSocketClose.bind(this, proxy_url, new Date()))
                this.proxy.web(req, res, opts)
            } else {
                throw new TodoException('What should happen if no url is given? Define a fallback')
            }

        } else {
            let _req_url = req.url.replace(/^\//, '')
            let _url = url.parse(_req_url);
            this.debug('proxing url ' + this._options.url, req.url, req.headers, _url);
            req.url = _req_url

            let opts = {
                target: _url.protocol + '//' + _url.host,
                proxyTimeout: 5000
            }
            this.proxy.web(req, res, opts)
        }


    }

    prepare() {
        this.proxy = HttpProxy.createProxyServer({});
        this.proxy.on('proxyReq', this.onProxyRequest.bind(this));
        this.proxy.on('proxyRes', this.onProxyResponse.bind(this));
        this.proxy.on('error', this.onProxyError.bind(this));
        this.proxy.on('open', this.onProxySocketOpen.bind(this));
        this.proxy.on('close', this.onProxySocketClose.bind(this))
    }


    finalize() {
        if (this.proxy) {
            this.proxy.close()
        }

    }

}