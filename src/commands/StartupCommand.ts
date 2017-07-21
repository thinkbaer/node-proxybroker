import {Loader} from "../Loader";

export class StartupCommand {

    command = "start";
    aliases = "s";
    describe = "Start the application.";


    builder(yargs: any) {
        return yargs;
    }

    async handler(argv: any) {
        await Loader._().boot()
    }
}