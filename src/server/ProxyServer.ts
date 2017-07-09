
import * as http from 'http'
import * as net from 'net'
import * as url from "url";

//import Timer = NodeJS.Timer;
import * as HttpProxy from "http-proxy"

import {Server} from "./Server";
import {IProxyServerOptions} from "./IProxyServerOptions";
import {Config} from "commons-config";
import {Runtime} from "../lib/Runtime";



export class ProxyServer extends Server {
    static readonly defaultOptions: IProxyServerOptions = Object.assign({}, Server.defaultOptions, {
        level: 3
    });

    _options: IProxyServerOptions;
    proxy: HttpProxy = null;

    constructor(options: IProxyServerOptions) {
        super(options)

        Runtime.$().setConfig('proxyserver',this._options)
    }

    get level(): number {
        return this._options.level
    }

    onProxyRequest(proxyReq: http.ClientRequest, req: http.IncomingMessage, res: http.ServerResponse, options: HttpProxy.ServerOptions): void {
        this.debug('onProxyRequest');
        this.debug('PR: ' + req.url);

        if (this.level == 3) {
            let sender_ip = req.socket.remoteAddress;
            let proxy_ip = req.socket.localAddress;
            let proxy_port = req.socket.localPort;

            proxyReq.setHeader('X-Forwarded-For', sender_ip);
            proxyReq.setHeader('Via', 'proxybroker on ' + proxy_ip + ':' + proxy_port);
            proxyReq.setHeader('X-Cache', 'DemoCache');
            proxyReq.setHeader('X-Cache-Lookup', 'MISSED');
            proxyReq.setHeader('X-Client-IP', sender_ip);

        } else if (this.level == 2) {
            let sender_ip = req.socket.remoteAddress;
            let proxy_ip = req.socket.localAddress;
            let proxy_port = req.socket.localPort;

            proxyReq.setHeader('Via', 'proxybroker on ' + proxy_ip + ':' + proxy_port);
            proxyReq.setHeader('X-Cache', 'DemoCache');
            proxyReq.setHeader('X-Cache-Lookup', 'MISSED');
        }
    }

    onProxyResponse(proxyRes: http.IncomingMessage, req: http.IncomingMessage, res: http.ServerResponse): void {
        this.debug('onProxyResponse')
    }

    onProxyError(err: Error, req: http.IncomingMessage, res: http.ServerResponse): void {
        this.debug('onProxyError')
    }

    onProxySocketOpen(proxySocket: net.Socket): void {
        this.debug('onProxySocketOpen')
    }

    onProxySocketClose(proxyRes: http.IncomingMessage, proxySocket: net.Socket, proxyHead: any): void {
        this.debug('onProxySocketClose')
    }

    root(req: http.IncomingMessage, res: http.ServerResponse): void {
        this.debug('proxyResponse');
        let _url = url.parse(req.url);
        let target_url = _url.protocol + '//' + req.headers.host;
        this.proxy.web(req, res, {target: target_url})
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
        this.proxy.close()
    }

}