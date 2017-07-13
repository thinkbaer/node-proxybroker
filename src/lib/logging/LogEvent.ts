import * as _ from 'lodash'
import {EventBus} from "../../events/EventBus";
import * as moment from "moment";


export default class LogEvent {

    private level: 'INFO';

    private _message: string = '';

    private args: any[] = [];

    private time: Date;

    constructor(opts: { level?: string, message?: string, args?: any[], time?: Date, [k: string]: any }) {
        if (opts.time) {
            opts.time = new Date()
        }
        this._message = opts.message
        _.assign(this, opts)
    }

    fire() {
        EventBus.post(this)
    }

    message() : string{
        let _msgs:string[] = [];

        if(!_.isEmpty(this._message)){
            _msgs.push(this._message)
        }

        if (!_.isEmpty(this.args)) {
            this.args.forEach(x => {
                if(_.isString(x)){
                    _msgs.push(x)
                }else{
                    _msgs.push('\n'+JSON.stringify(x, null, 2))
                }
            });
        }
        return _msgs.join('; ')
    }


    fullOut(): string {
        let msg = this.message()
        return '[' + moment(this.time).format('YYYY.MM.DD HH:mm:ss.SSS') + '] ' + this.level + ' ' + msg
    }

}