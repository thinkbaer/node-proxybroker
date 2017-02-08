import * as http from 'http'
import * as https from 'https'
import * as net from 'net'
import * as fs from 'fs'
import * as url from "url";

import Timer = NodeJS.Timer;

import * as HttpProxy from "http-proxy"

/**
 * Mock ProxyServer for the differnt proxy level types
 *
 *
 */

export interface ServerOptions {
    variant?: string
    stall?: number
    cert_file?: string
    cert?: string|Buffer
    key_file?: string
    key?: string|Buffer,
    strictSSL?: boolean,
    timeout?: number
}

const defaultOptions: ServerOptions = {
    variant: 'root',
    timeout: 120,
    stall: 0,
    cert_file: __dirname + '/../ssl/server.crt',
    key_file: __dirname + '/../ssl/server.key',
    strictSSL: true
}

abstract class DefaultServer {

    _debug: boolean = false

    inc: number = 0
    cache: {[key: number]: {t: Timer, s: net.Socket}} = {}
    server: net.Server = null
    _url: url.Url = null
    options: ServerOptions = null
    _abort: boolean = false


    constructor(port: number|string, hostname: string = "127.0.0.1", protocol: string = 'http', options: ServerOptions = {}) {
        this._url = url.parse(protocol + '://' + hostname + ':' + port)
        this.options = Object.assign(options, defaultOptions)
    }

    url(): string {
        return url.format(this._url)
    }

    set stall(n: number) {
        this.options.stall = n
    }

    get stall(): number {
        return this.options.stall
    }

    response(req: http.IncomingMessage, res: http.ServerResponse) {
        let inc = this.inc++
        this.log('request')
        let self = this
        let t = setTimeout(function () {
            self[self.options.variant](req, res)
            clearTimeout(self.cache[inc].t)
            delete self.cache[inc]
        }, this.options.stall)
        this.cache[inc] = {t: t, s: req.socket}
    }


    abstract createServer(): net.Server;


    root(req: http.IncomingMessage, res: http.ServerResponse) {
        this.log('process')
        res.writeHead(200, {"Content-Type": "application/json"});
        var data = {time: (new Date()).getTime(), headers: req.headers, rawHeaders: req.rawHeaders}
        var json = JSON.stringify(data);
        res.end(json);
    }

    forcedShutdown() {
        this._abort = true
        for (let x in this.cache) {
            if (this.cache[x].t) {
                clearTimeout(this.cache[x].t)
            }
            if (this.cache[x].s) {
                this.cache[x].s.destroy()
            }
            delete this.cache[x]
        }
        this.stop(() => {
        })
    }

    async start(done: Function = null): Promise<any> {
        let self = this
        this.server = this.createServer()

        let p = new Promise(function (resolve) {
            self.server = self.server.listen(parseInt(self._url.port), self._url.hostname, () => {
                self.log('start server')
                resolve()
            });
        })

        if (done) {
            await p
            done()
        } else {
            return p;
        }
    }

    async stop(done: Function = null): Promise<any> {
        let self = this
        let p = new Promise(function (resolve) {
            if (self.server) {
                self.server.close(function () {
                    self.server = null
                    resolve()
                })
            } else {

                resolve()
            }
        })

        if (done) {
            await p
            self.finalize()
            done()
        } else {
            self.finalize()
            return p;
        }
    }

    finalize(): void {
    }

    log(msg: string) {
        //console.log(msg)
    }

    debug(...msg: string[]) {
        if (this._debug) {
            console.log.apply(console, msg)
        }
    }
}

export class DefaultHTTPServer extends DefaultServer {

    constructor(port: number|string, hostname: string = "127.0.0.1", options: ServerOptions = {}) {
        super(port, hostname, 'http', options)
    }

    createServer(): http.Server {
        let server = http.createServer(this.response.bind(this))
        server.setTimeout(this.options.timeout, function (socket: net.Socket) {
            socket.destroy();
        })
        return server
    }

}


export class DefaultHTTPSServer extends DefaultServer {


    constructor(port: number|string, hostname: string = "127.0.0.1", options: ServerOptions = {}) {
        super(port, hostname, 'https', options)

        if (this.options.cert_file) {
            this.options.cert = fs.readFileSync(this.options.cert_file)
        }

        if (this.options.key_file) {
            this.options.key = fs.readFileSync(this.options.key_file)
        }
    }

    createServer(): https.Server {
        return https.createServer(this.options, this.response.bind(this))
    }
}


export abstract class HTTPProxyServer extends DefaultHTTPServer {

    proxy: HttpProxy = null

    constructor(port: number|string, hostname: string = "127.0.0.1", options: ServerOptions = {}) {
        super(port, hostname, options)
        // this.options.variant = 'proxyResponse'
    }

    proxyPrepare(): void {
        this.proxy = HttpProxy.createProxyServer()
        this.proxy.on('proxyReq', this.onProxyRequest.bind(this))
        this.proxy.on('proxyRes', this.onProxyResponse.bind(this))
        this.proxy.on('error', this.onProxyError.bind(this))
        this.proxy.on('open', this.onProxySocketOpen.bind(this))
        this.proxy.on('close', this.onProxySocketClose.bind(this))
    }

    onProxyRequest(proxyReq: http.ClientRequest, req: http.IncomingMessage, res: http.ServerResponse, options: HttpProxy.ServerOptions): void {
        this.debug('onProxyRequest')
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
        this.debug('proxyResponse')
        let _url = url.parse(req.url)
        let target_url = _url.protocol + '//' + req.headers.host
        this.proxy.web(req, res, {target: target_url})
    }

    createServer(): http.Server {
        this.proxyPrepare()
        return http.createServer(this.response.bind(this))
    }

    finalize() {
        this.proxy.close()
    }

}

/**
 * L3 - Transparent proxy
 */
export class HTTPProxyServer_L3 extends HTTPProxyServer {

    constructor(port: number|string, hostname: string = "127.0.0.1", options: ServerOptions = {}) {
        super(port, hostname, options)
    }

    onProxyRequest(proxyReq: http.ClientRequest, req: http.IncomingMessage, res: http.ServerResponse, options: HttpProxy.ServerOptions): void {
        this.debug('onProxyRequest')

        this.debug('PR: ' + req.url)

        let sender_ip = req.socket.remoteAddress
        let proxy_ip = req.socket.localAddress
        let proxy_port = req.socket.localPort

        proxyReq.setHeader('X-Forwarded-For', sender_ip);
        proxyReq.setHeader('Via', 'proxybroker on ' + proxy_ip + ':' + proxy_port);

        proxyReq.setHeader('X-Cache', 'DemoCache');
        proxyReq.setHeader('X-Cache-Lookup', 'MISSED');
        proxyReq.setHeader('X-Client-IP', sender_ip);

        // proxyReq.setHeader('X_CLUSTER_CLIENT_IP', sender_ip);
    }

}
export class HTTPProxyServer_L2 extends HTTPProxyServer {


    onProxyRequest(proxyReq: http.ClientRequest, req: http.IncomingMessage, res: http.ServerResponse, options: HttpProxy.ServerOptions): void {
        this.debug('onProxyRequest')

        this.debug('PR: ' + req.url)

        let sender_ip = req.socket.remoteAddress
        let proxy_ip = req.socket.localAddress
        let proxy_port = req.socket.localPort

//        proxyReq.setHeader('X-Forwarded-For', sender_ip);
        proxyReq.setHeader('Via', 'proxybroker on ' + proxy_ip + ':' + proxy_port);

        proxyReq.setHeader('X-Cache', 'DemoCache');
        proxyReq.setHeader('X-Cache-Lookup', 'MISSED');
    }


}

export class HTTPProxyServer_L1 extends HTTPProxyServer {


    onProxyRequest(proxyReq: http.ClientRequest, req: http.IncomingMessage, res: http.ServerResponse, options: HttpProxy.ServerOptions): void {
        this.debug('onProxyRequest')
    }


}