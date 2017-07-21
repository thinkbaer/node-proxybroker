#!/usr/bin/env node
// import "reflect-metadata";

import {ValidateCommand} from "./commands/ValidateCommand";

import {FetchCommand} from "./commands/FetchCommand";
import {Loader} from "./Loader";


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


require("yargonaut")
    .style("blue")
    .style("yellow", "required")
    .helpStyle("green")
    .errorsStyle("red");


require("yargs")
    .usage("Usage: $0 <command> [options]")
    .command(new ValidateCommand())
    .command(new FetchCommand())
    .option("config", {
        alias: 'c',
        describe: "JSON string with configuration or name of the config file.",
        'default': false
    })
    .coerce('config', (c: any) => {
        Loader.configStatic(c)
    })
    .option("verbose", {
        alias: 'v',
        describe: "Enable logging.",
        'default': false
    })
    .coerce('verbose', (c: any) => {
        Loader.verbose(c)
    })


    .demandCommand(1)
    // .version(() => require(process.cwd() + "/package.json").version)
    // .alias("v", "version")
    .help("h")
    .alias("h", "help")
    .argv;