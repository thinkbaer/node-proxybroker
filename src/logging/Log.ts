import LogEvent from "./LogEvent";
export class Log {

    static enable: boolean = true;

    static console: boolean = false;


    static log(level:string, ...args: any[]) {
        if (Log.enable) {
            let l = new LogEvent({args: args, level:level});
            l.fire()
            if(Log.console){
                console.log(l.out())
            }
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
        if (Log.enable) {
            args.unshift('ERROR');
            console.error.apply(console, args)
        }

    }


}