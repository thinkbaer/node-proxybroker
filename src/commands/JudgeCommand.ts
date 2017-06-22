

import {Judge} from "../judge/Judge";
import {ReqResEvent} from "../judge/ReqResEvent";

import subscribe from "../events/decorator/subscribe"
import {EventBus} from "../events/EventBus";
import LogEvent from "../logging/LogEvent";
import {Log} from "../logging/Log";

class StdOut {

    @subscribe(ReqResEvent)
    onReqRes(rre: ReqResEvent){
        this.out(rre)
    }

    @subscribe(LogEvent)
    onLog(rre: LogEvent){
        this.out(rre)
    }

    private out(o:LogEvent | ReqResEvent){
        console.info(o.out())
    }
}


export class JudgeCommand {

    command = "judge";
    describe = "Test an IP and port for proxy abilities.";

    constructor(){
        EventBus.register(new StdOut())
    }

    builder(yargs: any) {
        return yargs
            .option("ip", {
                describe: "IP of the proxy server.",
                demand:true
            })
            .option("port", {
                describe: "Port of the proxy server.",
                demand:true
            })
    }

    async handler(argv: any) {


        let judge = new Judge()

        let booted = await judge.bootstrap()
        if(booted){
            await judge.wakeup()
            Log.info('judge server started')
            let results = await judge.validate(argv.ip,argv.port)
            Log.debug('judge validated')
            await judge.pending()
            Log.info('judge server stopped')
            Log.debug(results)
        }
    }
}