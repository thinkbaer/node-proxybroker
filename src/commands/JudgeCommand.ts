import {Judge} from "../judge/Judge";

import StdConsole from "./StdConsole";
import {Log} from "../lib/logging/Log";
import Todo from "../exceptions/TodoException";
import {EventBus} from "../events/EventBus";
import {Config} from "commons-config";


export class JudgeCommand {

    command = "judge-ip <ip> <port>";
    aliases = "j";
    describe = "Test <ip> with <port> for proxy abilities.";


    builder(yargs: any) {
        return yargs
    }

    async handler(argv: any) {
        EventBus.register(new StdConsole());
        Log.enable = StdConsole.$enabled = argv.verbose;

        let judgeCustomOptions = Config.get('validator.judge',{})
        let judge = new Judge(judgeCustomOptions);
        let booted = await judge.bootstrap();
        if (booted) {
            try {
                await judge.wakeup();
                let results = await judge.validate(argv.ip, argv.port);
                await judge.pending();
                console.log(JSON.stringify(results, null, 2))
            } catch (err) {
                Log.error(err);
                await judge.pending()
            }
        } else {
            throw new Todo()
        }
    }
}