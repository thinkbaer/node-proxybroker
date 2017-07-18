import * as fs from 'fs'
import * as _ from 'lodash'

import {Judge} from "../judge/Judge";

import StdConsole from "../lib/logging/StdConsole";
import {Log} from "../lib/logging/Log";
import {PlatformUtils} from "../utils/PlatformUtils";

import Todo from "../exceptions/TodoException";
import {JudgeResults} from "../judge/JudgeResults";
import {IJudgeOptions} from "../judge/IJudgeOptions";
import {Utils} from "../utils/Utils";
import {ProxyData} from "../proxy/ProxyData";
import {ProxyValidator} from "../proxy/ProxyValidator";
import {EventBus} from "../events/EventBus";
import {Config} from "commons-config";




export class JudgeFileCommand {

    command = "judge-file <file>";
    aliases = 'jf';
    describe = "Test a list with addresses in <file> for proxy abilities. (Format: ip:port\\n)";

    builder(yargs: any) {
        return yargs
            .option('format', {
                alias: 'f',
                describe: "Set outputformat (default: json).",
                'default': 'json',
                demand: true
            })
    }

    async handler(argv: any):Promise<any> {
        EventBus.register(new StdConsole());

        if (PlatformUtils.fileExist(argv.file)) {
            let buffer = fs.readFileSync(argv.file);
            let data = buffer.toString('utf-8').trim();
            let list: ProxyData[] = [];

            data.split(/\n/).forEach((value, index, array) => {
                let d = value.trim().split(/:|;/);
                // TODO check ip pattern
                if (d.length == 2 && d[0] && /[1-9]\d*/.test(d[1])) {
                    list.push(new ProxyData(d[0], parseInt(d[1])))
                }
            });


            if (list.length) {
                let validatorCustomOptions = Config.get('validator',{})
                let validator = new ProxyValidator(validatorCustomOptions, null);
                let booted = false;
                try {
                    booted = await validator.prepare()
                } catch (err) {
                    Log.error(err);
                    throw err
                }

                if (booted) {
                    try {
                        let inc = 0
                        for(let _q of list){
                            inc++
                            validator.push(_q)
                        }
                        Log.info('Added '+inc+ ' proxies to check')
                        await validator.await()
                    } catch (err) {
                        Log.error(err)
                    }

                    await validator.shutdown();

                    switch (argv.format) {
                        case 'json':
                            let data: JudgeResults[] = [];

                            list.forEach(_x => {
                                if (_x.results) {
                                    if (_x.results.http) {
                                        _x.results.http.logStr = _x.results.http.logToString();
                                        _x.results.http.log = null
                                    }
                                    if (_x.results.https) {
                                        _x.results.https.logStr = _x.results.https.logToString();
                                        _x.results.https.log = null
                                    }
                                    data.push(_x.results)
                                }
                            });
                            console.log(JSON.stringify(data, null, 2));
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

                            ].join(';')];
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
                                } else {
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
                            });
                            console.log(rows.join('\n'));
                            break;

                        default:
                            console.log(1);
                            break;
                    }
                } else {
                    throw new Todo()
                }

                return Promise.resolve(list)

            } else {
                Log.error('NO DATA');
                return Promise.resolve(null)
            }


        } else {
            throw new Todo()
        }
        /*
         */
    }
}

