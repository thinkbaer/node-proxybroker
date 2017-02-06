import * as mRequest from "request-promise-native";
import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as mUrl from 'url'
import * as tls from 'tls'
import * as events from 'events'
import {TLSSocket} from "tls";
import {HttpHeaders} from "../d/http_headers";
import {Url} from "url";


interface LogEntry {
    t: number, msg: string, s: string, code?: string,i: number
}


export class RequestResponseMonitor extends events.EventEmitter {


    // static cache:{[key:string]:RequestResponseMonitor} = {}
    _debug: boolean = false
    inc: number = 0
    id: string = null
    log_arr: Array<LogEntry> = []
    length: number = 0
    errors: Array<Error> = []
    socket: net.Socket = null
    request: mRequest.RequestPromise = null
    start: Date = new Date()
    end: Date = null
    duration: number = Infinity
    secured: boolean = false
    connected: boolean = false
    aborted: boolean = false
    okay: boolean = false

    sendedHead: string = ''
    receivedHead: string = ''
    receivedHeadDone: boolean = false

    headers_request: HttpHeaders = {}
    headers_response: HttpHeaders = {}




    private constructor(request: mRequest.RequestPromise, id: string) {
        super()
        request.on('socket', this.onSocket.bind(this))
        request.on('error', this.onError.bind(this))
        request.on('drain', this.onDrain.bind(this))
        request.on('request', this.onRequest.bind(this))

        this.id = id
        this.request = request
        //console.log(request)
    }

    get uri(): Url {
        return this.request['uri']
    }

    get proxy(): Url {
        return this.request['proxy']
    }

    get tunnel(): boolean {
        return <boolean>this.request['tunnel']
    }

    /**
     *
     * see https://nodejs.org/api/http.html#http_event_response
     *
     * TODO: lookup tunneling!
     *
     * @param request
     */
    onRequest(request: http.ClientRequest) {
        this.debug('onRequest')

        if (this.proxy) {
            this.addLog(`Try connect to ${mUrl.format(this.uri)} over proxy ${mUrl.format(this.proxy)} ...`);
        } else {
            this.addLog(`Try connect to ${mUrl.format(this.uri)} ...`);
        }

        request.setNoDelay(true)
        this.addLog('set TCP_NODELAY')

        if (this.proxy && this.tunnel) {
            this.addLog('HTTP-Tunneling enabled.')
        }




        request.on('abort', this.onRequestAbort.bind(this))
        request.on('aborted', this.onRequestAborted.bind(this))
        request.on('connect', this.onRequestConnect.bind(this))
        request.on('continue', this.onRequestContinue.bind(this))
        request.once('response', this.onRequestResponse.bind(this))
        // request.on('socket', this.onRequestSocket.bind(this))
        request.on('upgrade', this.onRequestUpgrade.bind(this))



        for (let k in request['_headers']) {
            this.headers_request[k] = request.getHeader(k)
        }

    }

    onRequestConnect(response: http.IncomingMessage, socket: net.Socket, head: Buffer) {
        this.debug('onRequestConnect')

        //response.on('aborted', this.onRequestResponseAborted.bind(this))
        // response.on('close', this.onRequestResponseClose.bind(this))
    }

    onRequestContinue() {
        this.debug('onRequestContinue')
    }


    onRequestResponse(response: http.IncomingMessage) {
        this.debug('onRequestResponse')
        // console.log(response)
        response.on('aborted', this.onRequestResponseAborted.bind(this))
        response.on('close', this.onRequestResponseClose.bind(this))

        let self = this



        for (let k in response.headers) {
            this.headers_response[k] = response.headers[k]
        }
    }

    onRequestResponseAborted() {
        this.debug('onRequestResponseAborted')
    }

    onRequestResponseClose() {
        this.debug('onRequestResponseClose')
    }

    /**
     * Duplicate of onSocket

     onRequestSocket(socket: net.Socket){
        this.debug('onRequestSocket')
    }
     */

    /**
     *
     */
    onRequestUpgrade(response: http.IncomingMessage, socket: net.Socket, head: Buffer) {
        this.debug('onRequestUpgrade')
    }

    /**
     * Emitted when the request has been aborted by the client. This event is only emitted on the first call to abort().
     */
    onRequestAbort() {
        this.debug('onRequestAbort')
    }

    /**
     * Emitted when the request has been aborted by the server and the network socket has closed.
     */
    onRequestAborted() {
        this.debug('onRequestAborted')
    }


    onError(error: Error) {
        this.debug('onError')
        this.handleError(error)
    }

    onDrain() {
        this.debug('onDrain')
    }


    /**
     * Socket established
     *
     * @param socket
     */
    onSocket(socket: net.Socket) {
        this.debug('onSocket')
        this.socket = socket

        if (socket['_pendingData']) {
            this.sendedHead = socket['_pendingData']
            this.sendedHead = this.sendedHead.split('\r\n\r\n').shift()
        }


        socket.on('close', this.onSocketClose.bind(this))
        socket.on('connect', this.onSocketConnect.bind(this))
        socket.on('data', this.onSocketData.bind(this))
        socket.on('drain', this.onSocketDrain.bind(this))
        socket.on('end', this.onSocketEnd.bind(this))
        socket.on('agentRemove', this.onSocketAgentRemove.bind(this))
        //socket.on('agentRemove', this.onSocketAgentRemove.bind(this))
        socket.on('error', this.onSocketError.bind(this))
        socket.on('lookup', this.onSocketLookup.bind(this))
        socket.on('timeout', this.onSocketTimeout.bind(this))

        if (socket instanceof tls.TLSSocket) {
            this.debug('IS TLSSocket')
            this.secured = true
            socket.on('OCSPResponse', this.onTLSSocketOCSPResponse.bind(this))
            socket.on('secureConnect', this.onTLSSocketSecureConnect.bind(this))
        }
    }

    onSocketClose(had_error: boolean) {
        this.debug('onSocketClose')
        this.finished()

    }


    onSocketAgentRemove(): void {
        this.debug('onSocketAgentRemove')
    }

    onSocketConnect() {
        this.debug('onSocketConnect')
        this.connected = true

        if (this.proxy) {
            this.addLog(`Connected to proxy ${mUrl.format(this.proxy)}`)
        } else {
            this.addLog(`Connected to ${this.socket.remoteAddress}:${this.socket.remotePort}`)
        }

        if (this.secured) {
            this.addLog(`Try handshake for secure connetion ...`)
        }


        this.addLog('','')
        this.sendedHead.split('\n').map((x: string) => {
            this.addClientLog(x.trim())
        })
        this.addLog('','')



    }

    onSocketData(data: Buffer) {
        this.debug('onSocketData', data.length)

        if (!this.receivedHeadDone) {
            let tmp: Buffer = Buffer.allocUnsafe(data.length)
            data.copy(tmp)

            this.receivedHead += tmp.toString('utf8')
            if (this.receivedHead.match(/\r\n\r\n/)) {
                this.receivedHead = this.receivedHead.split("\r\n\r\n").shift() // "\r\n\r\n"
                this.receivedHeadDone = true

            }

            if(this.receivedHeadDone){
                this.addLog('','')
                this.receivedHead.split('\n').map((x: string) => {
                    this.addServerLog(x.trim())
                })
                this.addLog('','')
            }
        }

        this.length += data.length
    }

    onSocketDrain() {
        this.debug('onSocketDrain')
    }

    onSocketEnd() {
        this.debug('onSocketEnd')
        this.addClientLog('Forced end of socket.')
    }

    onSocketError(error: Error) {
        this.debug('onSocketError')


        this.handleError(error)
    }

    onSocketLookup(error: Error|null, address: string, family: string|null, host: string) {
        this.debug('onSocketLookup')
        this.handleError(error)
    }

    onSocketTimeout() {
        this.stop()
        this.debug('onSocketTimeout', `after ${this.duration}ms`)
        this.addLog(`Socket timed out after ${this.duration}ms`)
    }

    onTLSSocketOCSPResponse(buffer: Buffer) {
        this.debug('onTLSSocketOCSPResponse')
    }

    onTLSSocketSecureConnect() {
        this.debug('onTLSSocketSecureConnect')
        this.stop()
        this.addLog(`Secured connection established (${this.duration}ms)`)

    }


    stop() {
        this.end = new Date()
        this.duration = this.end.getTime() - this.start.getTime()
    }


    static monitor(_request: mRequest.RequestPromise, id?: string): RequestResponseMonitor {
        let rrm = new RequestResponseMonitor(_request, id)
        return rrm
    }


    logToString(sep: string = "\n"): string {
        let msg: Array<string> = []

        this.log_arr.sort(function (a: LogEntry, b: LogEntry) {
            return a.i < b.i ? (b.i > a.i ? -1 : 0) : 1
        })

        let ignore_emtpy = false
        for (let entry of this.log_arr) {
            let str = (entry.s + ' ' + entry.msg).trim()
            if(str.length == 0 && ignore_emtpy){
                continue
            }else if(str.length == 0){
                ignore_emtpy = true
            }else{
                ignore_emtpy = false
            }
            msg.push(str)
        }

        return msg.join(sep)
    }



    addClientLog(msg: string): void {
        this.addLog(msg, '>')
    }

    addServerLog(msg: string): void {
        this.addLog(msg, '<')
    }

    addLog(msg: string, s: string = '*'): void {
        let _inc = this.inc++

        this.log_arr.push({
            i: _inc,
            t: new Date().getTime(),
            s: s,
            msg: msg
        })
    }


    private handleError(error: Error): boolean {
        if (error) {
            let exists = false
            for (let i = 0; i < this.errors.length; i++) {
                if (this.errors[i].message == error.message) {
                    exists = true
                    break;
                }
            }
            if (!exists) {

                if (error.message.match(/ECONNREFUSED/)) {
                    this.connected = false
                    this.addLog(`Connection refused.`,'#')
                } else if (error.message.match(/socket hang up/)) {
                    this.aborted = true
                    this.addLog(`Connection aborted.`,'#')
                }

                this.errors.push(error)
                return true
            }

        }
        return false

    }

    lastError(): Error|null {
        if (this.errors.length > 0) {
            return this.errors[this.errors.length - 1]
        }
        return null
    }

    finished() {
        this.stop()


        let str: string = ''
        let last_error = this.lastError()

        let self = this


        if (!this.errors.length) {
            this.addLog(`Received ${this.length} byte from sender.`)
        }

        console.log(this.socket.remoteAddress)

        if (!last_error) {
            str = `Connection closed to ${mUrl.format(this.uri)} (${this.duration}ms)`
        } else {
            str = 'Connection not established.'
        }

        this.socket = null

        if (last_error) {
            this.addClientLog('Connection aborted through errors:')
            this.errors.forEach((err: Error) => {
                this.addClientLog(` - ${err.message}`)
            })
        }

        this.addLog(str)
        this.emit('finished', last_error)
    }

    promise(): Promise<RequestResponseMonitor> {
        var self = this
        return new Promise(function (resolve, reject) {
            self.on('finished', function () {
                resolve(self)
            })
        })

    }

    log(level: string, ...msg: any[]) {
        console.log.apply(console, msg)
    }

    debug(...msg: any[]) {
        if (this._debug) {
            msg.unshift('DEBUG')
            this.log.apply(this, msg)
        }
    }

}