#!/usr/bin/env node
// import "reflect-metadata";

import {JudgeCommand} from "./commands/JudgeCommand";
import {EventBus} from "./events/EventBus";
import StdConsole from "./commands/StdConsole";
import {JudgeFileCommand} from "./commands/JudgeFileCommand";
import {FetchProviderProxyListCommand} from "./commands/FetchProviderProxyListCommand";

EventBus.register(new StdConsole())

require("yargonaut")
    .style("blue")
    .style("yellow", "required")
    .helpStyle("green")
    .errorsStyle("red");


require("yargs")
    .usage("Usage: $0 <command> [options]")
    .command(new JudgeCommand())
    .command(new JudgeFileCommand())
    .command(new FetchProviderProxyListCommand())
    .demand(1)
    // .version(() => require(process.cwd() + "/package.json").version)
    // .alias("v", "version")
    .help("h")
    .alias("h", "help")
    .argv;