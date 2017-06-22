import * as _ from 'lodash'
import {EventBus} from "../events/EventBus";
import * as moment from "moment";

export class ReqResEvent {

    nr: number

    direction: string

    time: Date

    message: ""

    code: string

    connId:string = ''

    constructor(opts: { nr: number, direction: string, time: Date, message: string, connId?:string, code?: string, [k: string]: any }) {
        _.assign(this, opts)
    }

    fire() {
        EventBus.post(this)
    }

    out(): string {

        return '['+moment(this.time).format('YYYY.MM.DD HH:mm:ss.SSS')+'] '+this.connId+' | '+ this.direction + ' ' + this.message
    }
}