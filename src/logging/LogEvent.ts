import * as _ from 'lodash'
import {EventBus} from "../events/EventBus";
import * as moment from "moment";


export default class LogEvent {

    level: 'INFO'

    message: string = ''

    args: any[] = []

    time: Date

    constructor(opts: { level?: string, message?: string, args?: any[], time?: Date, [k: string]: any }) {
        if (opts.time) {
            opts.time = new Date()
        }
        _.assign(this, opts)
    }

    fire() {
        EventBus.post(this)
    }

    out(): string {
        let msg = ''
        if (!_.isEmpty(this.args)) {
            let _msgs:string[] = []
            this.args.forEach(x => {
                if(_.isString(x)){
                    _msgs.push(x)
                }else{
                    _msgs.push('\n'+JSON.stringify(x, null, 2))
                }
            })
            msg = _msgs.join('; ')

        }
        return '[' + moment(this.time).format('YYYY.MM.DD HH:mm:ss.SSS') + '] ' + this.level + ' ' + this.message + '' + msg
    }

}