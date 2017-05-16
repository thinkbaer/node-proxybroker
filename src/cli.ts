#!/usr/bin/env node
import "reflect-metadata";
import {JudgeCommand} from "./commands/JudgeCommand";

require("yargonaut")
    .style("blue")
    .style("yellow", "required")
    .helpStyle("green")
    .errorsStyle("red");

require("yargs")
    .usage("Usage: $0 <command> [options]")
    .command(new JudgeCommand())
    .demand(1)
    .version(() => require("./package.json").version)
    .alias("v", "version")
    .help("h")
    .alias("h", "help")
    .argv;