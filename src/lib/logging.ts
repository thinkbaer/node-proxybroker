



export class Log {

    static enable:boolean = true


    static log(...args:any[]){
        if(Log.enable){
            console.log.apply(console, args)
        }
    }

    static info(...args:any[]){
        Log.log.apply(Log, args)
    }

    static warn(...args:any[]){
        Log.log.apply(Log, args)
    }

    static debug(...args:any[]){
        Log.log.apply(Log, args)
    }

    static error(...args:any[]){
        if(Log.enable){
            console.error.apply(console, args)
        }

    }


}