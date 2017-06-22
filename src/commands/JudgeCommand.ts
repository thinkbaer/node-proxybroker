

import {Judge} from "../judge/Judge";
import {EventBus} from "../events/EventBus";
import StdConsole from "./StdConsole";
import {Log} from "../logging/Log";




export class JudgeCommand {

    command = "judge-ip <ip> <port>";
    aliases = "j"
    describe = "Test <ip> with <port> for proxy abilities.";


    builder(yargs: any) {
        return yargs
            .option("verbose", {
                alias:'v',
                describe: "Enable logging",
                default:false
            })
    }

    async handler(argv: any) {
        Log.enable = StdConsole.$enabled = argv.verbose
        let judge = new Judge()
        let booted = await judge.bootstrap()
        if(booted){
            await judge.wakeup()
            let results = await judge.validate(argv.ip,argv.port)
            await judge.pending()
            console.log(JSON.stringify(results,null,2))
        }else{
            // TODO check this
        }
    }
}