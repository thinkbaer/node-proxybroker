import LogEvent from "./LogEvent";
export class Log {

    static enable: boolean = true


    static log(level:string, ...args: any[]) {
        if (Log.enable) {
            let l = new LogEvent({args: args, level:level})
            l.fire()
        }
    }

    static info(...args: any[]) {
        args.unshift('INFO')
        Log.log.apply(Log, args)
    }

    static warn(...args: any[]) {
        args.unshift('WARN')
        Log.log.apply(Log, args)
    }

    static debug(...args: any[]) {
        args.unshift('DEBUG')
        Log.log.apply(Log, args)
    }

    static error(...args: any[]) {
        if (Log.enable) {
            args.unshift('ERROR')
            console.error.apply(console, args)
        }

    }


}