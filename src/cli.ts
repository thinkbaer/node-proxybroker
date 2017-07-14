#!/usr/bin/env node
// import "reflect-metadata";

import {JudgeCommand} from "./commands/JudgeCommand";
import {EventBus} from "./events/EventBus";
import StdConsole from "./commands/StdConsole";
import {JudgeFileCommand} from "./commands/JudgeFileCommand";
import {FetchProviderProxyListCommand} from "./commands/FetchProviderProxyListCommand";
import {Log} from "./lib/logging/Log";
import {Config} from "commons-config";


process.on('uncaughtException', (err: Error) => {
    console.error(err);
    process.exit()
});

process.on('unhandledRejection', (err: Error) => {
    console.error(err);
    process.exit()
});



/*
 Config.options({
 configs: [
 {type: 'system'},
 // find in same directory proxybroker
 {type: 'file', file: {dirname: './', filename: 'proxybroker'}},
 // find in proxyborker
 {type: 'file', file: '${argv.configfile}'},
 ]
 })
 */

EventBus.register(new StdConsole());
Log.options({
    enable: true,
    transports: [
        {console: {defaultFormatter: true, stderrLevels: ['info', 'debug', 'error', 'warn']}}
    ]
})

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
    .option("verbose", {
        alias: 'v',
        describe: "Enable logging.",
        'default': false
    })
    .option("config", {
        alias: 'c',
        describe: "JSON string with configuration or name of the config file.",
        'default': false
    })
    .coerce('config', (c: any) => {
        if(c){

        }
    })
    .demandCommand(1)
    // .version(() => require(process.cwd() + "/package.json").version)
    // .alias("v", "version")
    .help("h")
    .alias("h", "help")
    .argv;