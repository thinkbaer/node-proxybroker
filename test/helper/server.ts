import * as http from 'http'
import * as https from 'https'
import * as net from 'net'
import * as fs from 'fs'
import {isNumber} from "util";
import * as url from "url";
import {Server} from "net";
import Timer = NodeJS.Timer;


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
    variant: 'fallback',
    timeout: 120,
    stall: 0,
    cert_file: __dirname + '/../ssl/server.crt',
    key_file: __dirname + '/../ssl/server.key',
    strictSSL: true
}

abstract class DefaultServer {

    inc: number = 0
    cache: {[key: number]: {t: Timer,s:net.Socket}} = {}
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
        this.cache[inc] = {t: t, s:req.socket}
    }


    abstract createServer(): net.Server;


    fallback(req: http.IncomingMessage, res: http.ServerResponse) {
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
        this.stop(() => {})
    }

    start(done: Function) {
        let self = this
        this.server = this.createServer()
        this.server = this.server.listen(parseInt(this._url.port), this._url.hostname, () => {
            self.log('start server')
            done()
        });
    }

    stop(done: Function) {
        if (this.server) {

            let self = this
            this.server.close(function () {
                self.server = null
                done()
            })
        } else {
            done()
        }
    }

    log(msg: string) {
       // console.log(msg)
    }
}

export class DefaultHTTPServer extends DefaultServer {

    constructor(port: number|string, hostname: string = "127.0.0.1", options: ServerOptions = {}) {
        super(port, hostname, 'http', options)
    }

    createServer(): http.Server {
        let server = http.createServer(this.response.bind(this))
        server.setTimeout(this.options.timeout, function (socket:net.Socket) {
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

