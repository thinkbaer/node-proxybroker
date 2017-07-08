import {Judge} from "../judge/Judge";

import StdConsole from "./StdConsole";
import {Log} from "../logging/Log";
import Todo from "../exceptions/TodoException";
import {Utils} from "../utils/Utils";
import {IJudgeOptions} from "../judge/IJudgeOptions";


export class JudgeCommand {

    command = "judge-ip <ip> <port>";
    aliases = "j";
    describe = "Test <ip> with <port> for proxy abilities.";


    builder(yargs: any) {
        return yargs
            .option("verbose", {
                alias: 'v',
                describe: "Enable logging",
                'default': false
            })
            .option("config", {
                alias: 'c',
                describe: "Judge config json",
                'default': '{}'
            })
    }

    async handler(argv: any) {
        Log.enable = StdConsole.$enabled = argv.verbose;
        let judgeOptions: IJudgeOptions = Judge.default_options();
        if (argv.config) {
            judgeOptions = Utils.merge(judgeOptions, JSON.parse(argv.config))
        }

        let judge = new Judge(judgeOptions);
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