import * as fs from 'fs'

import {Judge} from "../judge/Judge";

import StdConsole from "./StdConsole";
import {Log} from "../logging/Log";
import {PlatformUtils} from "../utils/PlatformUtils";

import Todo from "../exceptions/TodoException";
import {JudgeResults} from "../judge/JudgeResults";
import {IJudgeOptions} from "../judge/IJudgeOptions";
import {Utils} from "../utils/Utils";
import {ProxyData} from "../proxy/ProxyData";
import {ProxyValidationController} from "../proxy/ProxyValidationController";


export class JudgeFileCommand {

    command = "judge-file <file> [outputformat]"
    aliases = 'jf'
    describe = "Test a list with addresses in <file> for proxy abilities. (Format: ip:port\\n)";

    builder(yargs: any) {
        return yargs
            .option("verbose", {
                alias: 'v',
                describe: "Enable logging",
                default: false
            })
            .option("config", {
                alias: 'c',
                describe: "Judge config json",
                default: '{}'
            })
            .option('format', {
                alias: 'f',
                describe: "Set outputformat (default: json).",
                default: 'json',
                demand: true
            })
    }

    async handler(argv: any) {
        Log.enable = StdConsole.$enabled = argv.verbose


        if (PlatformUtils.fileExist(argv.file)) {
            let buffer = fs.readFileSync(argv.file)
            let data = buffer.toString('utf-8').trim()
            let list: ProxyData[] = []

            data.split(/\n/).forEach((value, index, array) => {
                let d = value.trim().split(/:|;/)
                // TODO check ip pattern
                if (d.length == 2 && d[0] && /[1-9]\d*/.test(d[1])) {
                    list.push(new ProxyData(d[0], parseInt(d[1])))
                }
            })


            if (list.length) {


                let judgeOptions: IJudgeOptions = Judge.default_options()
                if (argv.config) {
                    judgeOptions = Utils.merge(judgeOptions, JSON.parse(argv.config))
                }

                let validator = new ProxyValidationController(judgeOptions);
                let booted = false
                try {
                    booted = await validator.prepare()
                } catch (err) {
                    Log.error(err)
                }
                if (booted) {
                    try {

                        list.forEach(_q => {
                            validator.push(_q)
                        })

                        await validator.await()
                    } catch (err) {
                        Log.error(err)
                    }

                    await validator.shutdown()

                    switch (argv.format) {
                        case 'json':
                            let data: JudgeResults[] = []
                            list.forEach(_x => {
                                _x.results.http.logStr = _x.results.http.logToString()
                                _x.results.https.logStr = _x.results.https.logToString()
                                _x.results.http.log = null
                                _x.results.https.log = null
                                data.push(_x.results)
                            })

                            console.log(JSON.stringify(data, null, 2))
                            break;
                        case 'csv':
                            let rows: string[] = [[
                                "ip",
                                "port",
                                "http.error",
                                "http.error.code",
                                "http.level",
                                "http.duration",
                                "http.log",
                                "https.error",
                                "https.error.code",
                                "https.level",
                                "https.duration",
                                "https.log",
                                "country_code",
                                "country_name",
                                "region_code",
                                "region_name",
                                "city",
                                "latitude",
                                "longitude"

                            ].join(';')]
                            list.forEach(_x => {
                                if (_x.results) {
                                    rows.push([
                                        _x.results.ip,
                                        _x.results.port,
                                        _x.results.http.hasError() ? '"' + (_x.results.http.error.toString()).replace('"', '""') + '"' : '',
                                        _x.results.http.hasError() ? '"' + (_x.results.http.error.code).replace('"', '""') + '"' : '',
                                        _x.results.http.level,
                                        _x.results.http.duration,
                                        '"' + _x.results.http.logToString().replace('"', '""') + '"',
                                        _x.results.https.hasError() ? '"' + (_x.results.https.error.toString()).replace('"', '""') + '"' : '',
                                        _x.results.https.hasError() ? '"' + (_x.results.https.error.code).replace('"', '""') + '"' : '',
                                        _x.results.https.level,
                                        _x.results.https.duration,
                                        '"' + _x.results.https.logToString().replace('"', '""') + '"',
                                        _x.results.country_code,
                                        _x.results.country_name,
                                        _x.results.region_code,
                                        _x.results.region_name,
                                        _x.results.city,
                                        _x.results.latitude,
                                        _x.results.longitude

                                    ].join(';'))
                                }else{
                                    rows.push([
                                        _x.ip,
                                        _x.port,
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                        '',
                                    ].join(';'))
                                }
                            })
                            console.log(rows.join('\n'))
                            break;

                        default:
                            console.log(1)
                            break;
                    }
                } else {
                    throw new Todo()
                }


            } else {
                Log.error('NO DATA')
            }


        } else {
            throw new Todo()
        }
        /*
         */
    }
}

