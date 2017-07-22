#!/usr/bin/env node

import "reflect-metadata";
import {ValidateCommand} from "./commands/ValidateCommand";

import {FetchCommand} from "./commands/FetchCommand";
import {Loader} from "./Loader";
import {StartupCommand} from "./commands/StartupCommand";



require("yargonaut")
    .style("blue")
    .style("yellow", "required")
    .helpStyle("green")
    .errorsStyle("red");


require("yargs")
    .usage("Usage: $0 <command> [options]")
    .command(new ValidateCommand())
    .command(new FetchCommand())
    .command(new StartupCommand())
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