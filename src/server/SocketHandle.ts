import * as net from 'net'
import {Log} from "../lib/logging/Log";
import {IHeader} from "../judge/IHeader";


export class SocketHandle {

    socket: net.Socket;

    data: Buffer;

    error: Error;

    statusCode: number;


    constructor(socket: net.Socket) {
        this.socket = socket
        this.socket.on('data', this.onData.bind(this))
        this.socket.on('close', this.onClose.bind(this))
        this.socket.on('error', this.onError.bind(this))
        //this.socket.on('end',this.onEnd.bind(this))
    }

    onData(data: Buffer) {
        if (this.data) {
            this.data = Buffer.concat([this.data, data])
        } else {
            this.data = data
            let _data = data.toString().trim()
            if (_data) {
                let first = _data.split('\r\n').shift()
                let matches = first.match(/ (\d{3}) /)
                if (first && matches && matches.length > 0) {
                    this.statusCode = parseInt(matches[1])
                }
            } else {
                // Not data?
                this.debug('No data delivered')
            }
        }
    }

    onError(err: Error) {
        this.debug(err)
        this.error = err
    }

    onClose(had_error: boolean) {
        this.socket.emit('finished')
    }

    onFinish(): Promise<SocketHandle> {
        let self = this
        return new Promise(resolve => {
            self.socket.once('finished', resolve.bind(resolve, self))
        })
    }


    onEnd() {

    }


    debug(...args: any[]) {
        Log.debug.apply(Log, args)
    }
}