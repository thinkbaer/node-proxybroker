import LogEvent from "./LogEvent";
import * as winston from "winston";
import * as _ from 'lodash'
import {ILoggerOptions} from "./ILoggerOptions";
import TodoException from "../../exceptions/TodoException";
import {LoggerOptions, TransportInstance, TransportOptions} from "winston";
import * as moment from "moment";

const DEFAULT_TRANSPORT_OPTIONS: TransportOptions = {
    timestamp: true,
    json: false,
    defaultFormatter: true

}

const DEFAULT_OPTIONS: ILoggerOptions = {
    enable: true,

    events: true,

    level: 'warn',

    transports: [
        {
            console: {
                name: 'console',
                timestamp: true,
                json: false
            }
        }
    ]
}

export class Log {

    static self: Log = null

    static enable: boolean = true;

    static enableEvents: boolean = true;

    static console: boolean = false;

    private defaultLogger: winston.LoggerInstance = null

    private _options: ILoggerOptions = null

    constructor() {
    }

    private create(opts: LoggerOptions): Log {
        this.defaultLogger = new (winston.Logger)(opts);
        return this
    }

    static _() {
        if (!this.self) {
            this.self = new Log()
        }
        return this.self
    }

    private static defaultFormatter(options: any) {
        // Return string will be passed to logger.
        //console.log(options)
        return '[' + moment(Date.now()).format('YYYY.MM.DD HH:mm:ss.SSS') + '] ' +
            '['+options.level.toUpperCase() +']'+ ' '.repeat(7 - options.level.length) +
            (options.message ? options.message : '') +
            (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '' );
    }

    static options(options: ILoggerOptions): ILoggerOptions {
        options = _.defaults(options, DEFAULT_OPTIONS)
        Log.enable = options.enable
        Log.enableEvents = options.events
        let opts: LoggerOptions = {
            level: options.level,
            transports: []
        }

        this._()._options = options
        // this._()._logger.configure(opt)

        for (let opt of options.transports) {

            let k = Object.keys(opt).shift()
            let transportOptions: TransportOptions = _.defaults(opt[k], DEFAULT_TRANSPORT_OPTIONS)

            if (!transportOptions.formatter && transportOptions['defaultFormatter']) {
                transportOptions.formatter = Log.defaultFormatter;
            }

            switch (k) {
                case 'file':
                    opts.transports.push(new winston.transports.File(transportOptions))
                    break;
                case 'console':
                    opts.transports.push(new winston.transports.Console(transportOptions))
                    break;
                case 'dailyrotatefile':
                    opts.transports.push(new winston.transports.DailyRotateFile(transportOptions))
                    break;
                case 'http':
                    opts.transports.push(new winston.transports.Http(transportOptions))
                    break;
                case 'memory':
                    opts.transports.push(new winston.transports.Memory(transportOptions))
                    break;
                case 'webhook':
                    opts.transports.push(new winston.transports.Webhook(transportOptions))
                    break;
                case 'winstonmodule':
                    opts.transports.push(new winston.transports.Loggly(transportOptions))
                    break;
                default:
                    throw new TodoException()
            }
        }
        this._().create(opts)
        return this._()._options
    }

    static log(level: string, ...args: any[]) {
        if (Log.enable) {
            let l = new LogEvent({args: args, level: level});
            if(Log.enableEvents){
                l.fire()
            }
            this._().defaultLogger.log(level.toLocaleLowerCase(), l.message());
        }
    }

    static info(...args: any[]) {
        args.unshift('INFO');
        Log.log.apply(Log, args)
    }

    static warn(...args: any[]) {
        args.unshift('WARN');
        Log.log.apply(Log, args)
    }

    static debug(...args: any[]) {
        args.unshift('DEBUG');
        Log.log.apply(Log, args)
    }

    static error(...args: any[]) {
        args.unshift('ERROR');
        Log.log.apply(Log, args)
    }


}