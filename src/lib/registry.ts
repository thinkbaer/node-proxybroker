import {API} from "../module";
import DB from "../db/db";
import * as events from 'events';

class ProxyUpdate {

    id:string

    constructor($r:Registry, ip:string, port:number, flags:number = 0 ){

    }

    check_if_exists(){

    }


    check_if_mark_as_disabled(){

    }



    save(){

    }




    run(){

    }





}

export class Registry extends events.EventEmitter implements API {

    backend: DB
    objects: Array<any> = new Array()
    Promise: Promise = Promise


    constructor(db: DB) {
        super()
        this.backend = db
        this.on('enqueue', this.processEnqueue.bind(this))
    }

    private doEnqueue() {

    }

    private processEnqueue() {
    }

    enqueue(ip: string, port: string|number, flags: number = 0) {

        ip = ip.trim()
        if (!ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
            throw new Error('Wrong format of IP "' + ip + '"')
        }

        if (typeof port !== 'number') {
            port = parseInt(port)
        }

        if (1 > port || port > 65535) {
            throw new Error('port ot of range ' + port)
        }

        return (new EnqueueOp(this, ip, port, flags))



        // lookup if not exists
    }


}