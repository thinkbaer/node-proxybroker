import * as _ from 'lodash'

import * as net from 'net'
import {Log} from "../lib/logging/Log";
import Exceptions from "../exceptions/Exceptions";


export class SocketHandle {

    private static inc: number = 1

    readonly id: number;

    readonly start: Date;

    stop: Date;

    duration: number;

    socket: net.Socket;

    finished: boolean = false

    ended: boolean = true

    data: Buffer;

    error: Error = null;

    socketError:boolean = false

    statusCode: number;

    query: Buffer;

    headersList: { key: string, orgKey: string, value: string }[] = []

    headers: Buffer;

    body: Buffer;

    ssl: boolean


    constructor(socket: net.Socket, ssl: boolean = false) {
        this.ssl = ssl
        this.socket = socket
        this.start = new Date()
        socket.setKeepAlive(true)
        this.socket.on('data', this.onData.bind(this))
        this.socket.on('end', this.onEnd.bind(this))
        this.socket.on('close', this.onClose.bind(this))
        this.socket.on('error', this.onError.bind(this))
        this.id = SocketHandle.inc++;
        this.socket['handle_id'] = this.id
    }

    onData(data: Buffer) {
        this.ended = false
        // this.debug('socket data ' + data.length)
        if (!data || this.ssl) {
            return;
        }
        if (this.data) {
            this.data = Buffer.concat([this.data, data])
            if (this.body) {
                this.body = Buffer.concat([this.body, data])
            }
        } else {
            this.data = data;
            let headerEnd = data.indexOf('\r\n');
            let headersEnd = data.indexOf('\r\n\r\n');


            if (headerEnd < headersEnd && headersEnd > 0) {
                this.query = Buffer.allocUnsafe(headerEnd)
                this.headers = Buffer.allocUnsafe(headersEnd - headerEnd - 2)
                this.body = Buffer.allocUnsafe(data.length - headersEnd - 4)

                data.copy(this.query, 0, 0, headerEnd)
                data.copy(this.headers, 0, headerEnd + 2, headersEnd)
                data.copy(this.body, 0, headersEnd + 4)


                for (let _x of this.headers.toString().split('\r\n')) {
                    let split = _x.split(':', 2)
                    this.headersList.push({
                        key: split[0].trim().toLocaleLowerCase(),
                        orgKey: split[0].trim(),
                        value: split[1].trim()
                    })
                }

                if (this.query.length > 0) {
                    let first = this.query.toString();
                    let matches = first.match(/ (\d{3}) /);
                    if (first && matches && matches.length > 0) {
                        this.statusCode = parseInt(matches[1]);
                        if (this.statusCode >= 400) {
                            this.error = Exceptions.handle(new Error(first))
                        }
                    }
                } else {
                    // Not data?
                    this.debug('No data delivered')
                }
            }
        }
    }

    removeHeader(key: string) {
        key = key.toLocaleLowerCase()
        _.remove(this.headersList, {key: key})
    }

    setHeader(orgKey: string, value: string) {
        this.removeHeader(orgKey)
        let key = orgKey.toLocaleLowerCase()
        this.headersList.push({key: key, orgKey: orgKey, value: value})
    }

    build(): Buffer {
        const buf = Buffer.allocUnsafe(2)
        buf.write('\r\n')

        let entries = []
        for (let _x of this.headersList) {
            entries.push(_x.orgKey + ': ' + _x.value);
        }
        let strEntries = entries.join('\r\n');

        this.headers = Buffer.allocUnsafe(strEntries.length);
        this.headers.write(strEntries);

        return Buffer.concat([
            this.query, buf, this.headers, buf, buf, this.body]
        );

    }

    hasError() {
        return this.error !== null
    }

    hasSocketError() {
        return this.socketError === true
    }

    onError(err: Error) {
        this.debug('ERROR', err);
        this.socketError = true
        this.error = Exceptions.handle(err);
    }

    onEnd() {
        this.debug('onEnd');
        this.ended = true
    }

    onClose(had_error: boolean) {

        this.stop = new Date();
        this.duration = this.stop.getTime() - this.start.getTime();
        this.debug('socket close error=' + had_error + ' duration=' + this.duration);
        this.finished = true;
        this.socket.emit('finished');
    }

    onFinish(): Promise<SocketHandle> {
        let self = this;
        return new Promise(resolve => {
            self.socket.once('finished', resolve.bind(resolve, self));
        })
    }

    dump() {
        if (this.data) {
            return this.data.toString()
        }
        return ''
    }



    debug(...args: any[]) {
        if (args.length >= 1 && typeof args[0] === 'string') {
            args[0] = 'SID_' + this.id + ' ' + args[0]
        } else {
            args.unshift('SID_' + this.id)
        }

        Log.debug.apply(Log, args)
    }
}