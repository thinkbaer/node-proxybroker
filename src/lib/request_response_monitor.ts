import * as _request from "request-promise-native";
import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as tls from 'tls'
import * as events from 'events'
import {TLSSocket} from "tls";
import {HttpHeaders} from "../d/http_headers";


interface LogEntry {
    t: number, msg: string, s?: boolean, code?: string,i: number
}


export class RequestResponseMonitor extends events.EventEmitter {


    // static cache:{[key:string]:RequestResponseMonitor} = {}
    _debug: boolean = false
    inc: 0
    id: string = null
    log_arr: Array<LogEntry> = []
    length: number = 0
    errors: Array<Error> = []
    socket: net.Socket = null
    start: Date = new Date()
    end: Date = null
    duration: number = Infinity
    secured: boolean = false
    connected:boolean = false
    aborted:boolean = false
    okay: boolean = false

    headers_request: HttpHeaders = {}
    headers_response: HttpHeaders = {}



//    private promise:Promise<any> = null

    private constructor(request: _request.RequestPromise, id: string) {
        super()
        request.on('socket', this.onSocket.bind(this))
        request.on('error', this.onError.bind(this))
        request.on('drain', this.onDrain.bind(this))
        request.on('request', this.onRequest.bind(this))
        this.id = id
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

        this.addClientLog("Try connect to " + request.getHeader('host') + ' ...');

        request.setNoDelay(true)
        this.addClientLog('set TCP_NODELAY')

        this.debug('onRequest')
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

        response.on('aborted', this.onRequestResponseAborted.bind(this))
        response.on('close', this.onRequestResponseClose.bind(this))

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

        // this.debug(socket)

        socket.on('close', this.onSocketClose.bind(this))
        socket.on('connect', this.onSocketConnect.bind(this))
        socket.on('data', this.onSocketData.bind(this))
        socket.on('drain', this.onSocketDrain.bind(this))
        socket.on('end', this.onSocketEnd.bind(this))
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
        if(!had_error && !this.errors.length){
            this.addClientLog(`Received ${this.length} byte from sender.`)
        }
        this.finished()

    }

    onSocketConnect() {
        this.debug('onSocketConnect')
        this.connected = true
        this.addClientLog(`Connected to ${this.socket.remoteAddress}:${this.socket.remotePort}`)
        if (this.secured) {
            this.addClientLog(`Try handshake for secure connetion ...`)
        }
    }

    onSocketData(data: Buffer) {
        this.debug('onSocketData', data.length)
        /*
         let tmp:Buffer = Buffer.allocUnsafe(data.length)
         data.copy(tmp)
         console.log(tmp.toString('utf8'))
         */
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
        this.addClientLog(`Socket timed out after ${this.duration}ms`)
    }

    onTLSSocketOCSPResponse(buffer: Buffer) {
        this.debug('onTLSSocketOCSPResponse')
    }

    onTLSSocketSecureConnect() {
        this.debug('onTLSSocketSecureConnect')
        this.stop()
        this.addClientLog(`Secured connection established (${this.duration}ms)`)

    }


    private stop() {
        this.end = new Date()
        this.duration = this.end.getTime() - this.start.getTime()
    }


    static monitor(_request: _request.RequestPromise, id?: string): RequestResponseMonitor {
        let rrm = new RequestResponseMonitor(_request, id)
        return rrm
    }


    logToString(sep: string = "\n"): string {
        let msg: Array<string> = []

        this.log_arr.sort(function (a: LogEntry, b: LogEntry) {
            return a.i < b.i ? (b.i > a.i ? 1 : 0) : -1
        })

        for (let x in this.log_arr) {
            msg.push(this.log_arr[x].s ? '< ' : '> ' + '' + this.log_arr[x].msg)
        }

        return msg.join(sep)
    }


    addClientLog(msg: string): void {
        this.addLog(msg, false)
    }

    addServerLog(msg: string): void {
        this.addLog(msg, true)
    }

    addLog(msg: string, s: boolean = false): void {
        let _inc = this.inc++
        this.log_arr.push({
            i: _inc,
            t: new Date().getTime(),
            s: s,
            msg: msg
        })
    }


    private handleError(error: Error):boolean {
        if (error) {
            let exists = false
            for(let i=0;i<this.errors.length;i++){
                if(this.errors[i].message == error.message){
                    exists = true
                    break;
                }
            }
            if(!exists) {

                if (error.message.match(/ECONNREFUSED/)){
                    this.connected = false
                    this.addClientLog(`Connection refused.`)
                }else if(error.message.match(/socket hang up/)){
                    this.aborted = true
                    this.addClientLog(`Connection aborted.`)
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

        let str:string = ''
        let last_error = this.lastError()

        if(this.socket.remoteAddress){
            str = `Connection closed to ${this.socket.remoteAddress}:${this.socket.remotePort} (${this.duration}ms)`
        }else if(last_error){
            str = 'Connection not established.'
        }

        if (last_error) {
            this.addClientLog('Connection aborted through errors:')
            this.errors.forEach((err: Error) => {
                this.addClientLog(` - ${err.message}`)
            })
        }

        this.addClientLog(str)
        this.emit('finished', last_error)
    }

    promise(): Promise<any> {
        var self = this
        return new Promise(function (resolve, reject) {
            self.on('finished', function () {
                resolve()
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