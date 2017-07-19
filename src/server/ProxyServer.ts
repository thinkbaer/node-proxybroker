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
import {Protocol} from "_debugger";
import {ProtocolType} from "../lib/ProtocolType";


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
        this.debug('onProxyRequest ' + this._options.url + ' for '+ req.url);

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
                    let conn_string = 'CONNECT ' + request.url + ' HTTP/1.1\r\nHost: ' + request.url + '\r\n\r\n'
                    downstream.write(conn_string)
                    downstream.write(head);
                    downstream.pipe(upstream);
                    upstream.pipe(downstream)
                });
            } else {
                throw new TodoException('What should happen if no url is given? Define a fallback')
            }

        } else {

            let downstream = net.connect(parseInt(rurl.port), rurl.hostname, function () {
                self.debug('downstream connected to ' + request.url);
                upstream.write(
                    'HTTP/' + request.httpVersion + ' 200 Connection Established\r\n' +
                    'Proxy-agent: Proxybroker\r\n' +
                    '\r\n');
                downstream.write(head);
                downstream.pipe(upstream);
                upstream.pipe(downstream)
            });
        }
    }

    async root(req: http.IncomingMessage, res: http.ServerResponse) {
        this.debug('proxyResponse ' + this._options.url);
        let proxy_url: IUrlBase = null
        if (this._options.toProxy && this._options.target) {
            proxy_url = await this.getTarget(req.headers)

            let _str = proxy_url.protocol + '://' + proxy_url.host + ':' + proxy_url.port
            if (proxy_url) {
                this.debug('proxing over proxy ' + _str + ' for url ' + req.url);
                this.proxy.web(req, res, {target: _str, toProxy: true})
            } else {
                throw new TodoException('What should happen if no url is given? Define a fallback')
            }

        } else {

            if (/^\//.test(req.url)) {
                // from proxy req

            } else {
                // direct req

            }


            let _req_url = req.url.replace(/^\//, '')
            let _url = url.parse(_req_url);
            this.debug('proxing url ' + this._options.url, req.url, req.headers, _url);
            req.url = _req_url

            this.proxy.web(req, res, {target: _url.protocol+'//'+_url.host})

            /*
            //return;

            let port = 80
            if (!_url.port) {
                if (_url.protocol === 'https:') {
                    port = 443
                }
            } else {
                port = parseInt(_url.port)
            }

            let downstream = net.connect(port, _url.host, function () {
                // res.write('HTTP/' + req.httpVersion + ' 200 Connection Established\r\n' +'Proxy-agent: Node-Proxy\r\n' + '\r\n');

                res.pipe(downstream)
                downstream.pipe(res)
            })
*/
        }


    }

    prepare() {
        this.proxy = HttpProxy.createProxyServer();
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