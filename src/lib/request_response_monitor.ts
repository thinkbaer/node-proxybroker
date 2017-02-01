import * as _request from "request-promise-native";
import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as events from 'events'

// import RequestAPI = request.RequestAPI;


export class RequestResponseMonitor extends events.EventEmitter {

    log: Array<string> = []
    length : number = null
    errors : Array<Error> = []
    socket : net.Socket = null
    start : Date = new Date()
    end : Date = null
    duration : number = Infinity
//    private promise:Promise<any> = null

    private constructor(request: _request.RequestPromise){
        super()
        request.on('socket',this.onSocket.bind(this))
        request.on('error',this.onError.bind(this))
        request.on('drain',this.onDrain.bind(this))
        request.on('request',this.onRequest.bind(this))



//        this.promise = _request.promise()
    }

    /**
     *
     * see https://nodejs.org/api/http.html#http_event_response
     *
     * TODO: lookup tunneling!
     *
     * @param request
     */
    onRequest(request: http.ClientRequest){
        console.log('onRequest')
        request.on('abort', this.onRequestAbort.bind(this))
        request.on('aborted', this.onRequestAborted.bind(this))
        request.on('connect', this.onRequestConnect.bind(this))
        request.on('continue', this.onRequestContinue.bind(this))
        request.once('response', this.onRequestResponse.bind(this))
        // request.on('socket', this.onRequestSocket.bind(this))
        request.on('upgrade', this.onRequestUpgrade.bind(this))

    }

    onRequestConnect(response: http.IncomingMessage, socket: net.Socket, head:Buffer){
        console.log('onRequestConnect')
        //response.on('aborted', this.onRequestResponseAborted.bind(this))
        // response.on('close', this.onRequestResponseClose.bind(this))
    }

    onRequestContinue(){
        console.log('onRequestContinue')
    }


    onRequestResponse(response: http.IncomingMessage){
        console.log('onRequestResponse')
        response.on('aborted', this.onRequestResponseAborted.bind(this))
        response.on('close', this.onRequestResponseClose.bind(this))
    }

    onRequestResponseAborted(){
        console.log('onRequestResponseAborted')
    }

    onRequestResponseClose(){
        console.log('onRequestResponseClose')
    }

    /**
     * Duplicate of onSocket

    onRequestSocket(socket: net.Socket){
        console.log('onRequestSocket')
    }
     */

    /**
     *
     */
    onRequestUpgrade(response: http.IncomingMessage, socket: net.Socket, head:Buffer){
        console.log('onRequestUpgrade')
    }

    /**
     * Emitted when the request has been aborted by the client. This event is only emitted on the first call to abort().
     */
    onRequestAbort(){
        console.log('onRequestAbort')
    }

    /**
     * Emitted when the request has been aborted by the server and the network socket has closed.
     */
    onRequestAborted(){
        console.log('onRequestAborted')
    }


    onError(error: Error){
        console.log('onError')
        this.handleError(error)

    }

    onDrain(){
        console.log('onError')

    }


    /**
     * Socket established
     *
     * @param socket
     */
    onSocket(socket: net.Socket){
        console.log('onSocket')
        this.socket = socket

        socket.on('close',this.onSocketClose.bind(this))
        socket.on('connect',this.onSocketConnect.bind(this))
        socket.on('data',this.onSocketData.bind(this))
        socket.on('drain',this.onSocketDrain.bind(this))
        socket.on('end',this.onSocketEnd.bind(this))
        socket.on('error',this.onSocketError.bind(this))
        socket.on('lookup',this.onSocketLookup.bind(this))
        socket.on('timeout',this.onSocketTimeout.bind(this))

    }

    onSocketClose(had_error: boolean){
        console.log('onSocketClose')

        this.end = new Date()
        this.duration = this.end.getTime() - this.start.getTime()

        if(had_error){
            this.emit('finished',this.errors.pop())
        }else{
            this.emit('finished')
        }

    }

    onSocketConnect(){
        console.log('onSocketConnect')
        this.log.push(`CONNECT ${this.socket.remoteAddress}:${this.socket.remotePort}`)
    }

    onSocketData(data:Buffer){
        console.log('onSocketData',data.length)
    }

    onSocketDrain(){
        console.log('onSocketDrain')
    }

    onSocketEnd(){
        console.log('onSocketEnd')
    }

    onSocketError(error:Error){
        console.log('onSocketError')
        this.handleError(error)
    }

    onSocketLookup(error:Error|null,address:string,family:string|null,host:string){
        console.log('onSocketLookup')
        this.handleError(error)
    }

    onSocketTimeout(){
        console.log('onSocketTimeout')
        this.log.push('TIMED OUT')
    }


    static monitor(_request: _request.RequestPromise): RequestResponseMonitor {
        let rrm = new RequestResponseMonitor(_request)
        return rrm
    }


    private handleError(error:Error){
        if(error){
            this.errors.push(error)
        }

    }

    promise() : Promise<any> {
        var self = this
        return new Promise(function(resolve,reject){
            self.on('finished', function(err:Error){
                if(err){
                    reject(err)
                }else{
                    resolve()
                }
            })
        })

    }

}