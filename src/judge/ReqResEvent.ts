import * as _ from 'lodash'
import {EventBus} from "../events/EventBus";
import * as moment from "moment";
import {Messages} from "../lib/Messages";

export class ReqResEvent {

    nr: number

    prefix: string

    time: Date

    msgId: string

    params: any = null

    connId:string = ''

    constructor(opts: { nr: number, prefix: string, time: Date, msgId: string, connId?:string, params: any, [k: string]: any }) {
        _.assign(this, opts)
    }

    fire() {
        EventBus.post(this)
    }

    message():string{
        let str = Messages.get(this.msgId,this.params)
        return str;
    }

    out(): string {

        return '['+moment(this.time).format('YYYY.MM.DD HH:mm:ss.SSS')+'] '+this.connId+' | '+ this.prefix + ' ' + this.message()
    }
}