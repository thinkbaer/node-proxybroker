

import {Judge} from "../judge/Judge";
export class JudgeCommand {

    command = "judge";
    describe = "Test an IP and port for proxy abilities.";

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
            let results = await judge.validate(argv.ip,argv.port)
            await judge.pending()
            console.log(results)

        }else{
        }
    }
}