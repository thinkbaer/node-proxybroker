import {Judge} from "../judge/Judge";

import StdConsole from "../lib/logging/StdConsole";
import {Log} from "../lib/logging/Log";
import Todo from "../exceptions/TodoException";
import {EventBus} from "../events/EventBus";
import {Config} from "commons-config";
import {PlatformUtils} from "../utils/PlatformUtils";
import * as fs from 'fs'
import * as url from 'url'
import {JudgeResults} from "../judge/JudgeResults";
import {ProxyData} from "../proxy/ProxyData";
import {ProxyValidator} from "../proxy/ProxyValidator";


const REGEX = /^((http|https):\/\/)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):?(\d{1,5})?$/

export class ValidateCommand {

    command = "validate <host_or_file>";
    aliases = "v";
    describe = "Validate an <host> (format: \"ip:port\") or a <file> with a list of hosts separated by newline.";


    builder(yargs: any) {
        return yargs
            .option('format', {
                alias: 'f',
                describe: "Select output format for results.",
                default: 'json'
            })
    }

    async handler(argv: any) {
        StdConsole.$enabled = Log.enable
        EventBus.register(new StdConsole());
        let list: ProxyData[] = [];

        if (PlatformUtils.fileExist(argv.host_or_file)) {


            let filename = argv.host_or_file
            let buffer = fs.readFileSync(filename);
            let data = buffer.toString('utf-8').trim();


            data.split(/\n/).forEach((value, index, array) => {
//                let d = value.trim().split(/:|;/);
                let matched = value.trim().match(REGEX)


                if(matched){
                    let schema:string = null
                    let ip:string = null
                    let port:number = 3128

                    if(matched[1] && matched[2]){
                        // http or https exists
                        schema = matched[2]
                    }

                    ip = matched[3]

                    if(matched[4]){
                        // port
                        port = parseInt(matched[4])
                    }

                    if(ip && port){
                        list.push(new ProxyData(ip, port))
                    }

                }

            });


            if (list.length) {
                let validatorCustomOptions = Config.get('validator', {})
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
                        for (let _q of list) {
                            inc++
                            validator.push(_q)
                        }
                        Log.info('Added ' + inc + ' proxies to check')
                        await validator.await()
                    } catch (err) {
                        Log.error(err)
                    }

                    await validator.shutdown();

                } else {
                    throw new Todo()
                }


            } else {
                Log.error('NO DATA');
            }


        } else {

            let matched = argv.host_or_file.match(REGEX)
            let schema:string = 'http'
            let ip:string = '127.0.0.1'
            let port:number = 3128

            if(matched){
                if(matched[1] && matched[2]){
                    // http or https exists
                    schema = matched[2]
                }else{

                }

                ip = matched[3]

                if(matched[4]){
                    // port
                    port = parseInt(matched[4])
                }else{

                }
            }else{
                return process.exit(1)
            }

/*
            if(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(argv.host_or_file)){
                argv.host_or_file = 'http://'+argv.host_or_file
            }

            let _url = url.parse(argv.host_or_file)

            if (!_url.port) {
                _url.port = "3128"
            }
*/

            let judgeCustomOptions = Config.get('validator.judge', {})
            let judge = new Judge(judgeCustomOptions);
            let booted = await judge.bootstrap();

            if (booted) {
                try {
                    let proxy = new ProxyData(ip, port)
                    await judge.wakeup();
                    proxy.results = await judge.validate(proxy.ip, proxy.port);
                    await judge.pending();
                    list.push(proxy)
                    // console.log(JSON.stringify(results, null, 2))
                } catch (err) {
                    Log.error(err);
                    await judge.pending()
                }
            } else {
                throw new Todo()
            }
        }


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
                let rows: string[] = [ValidateCommand.csvHeader.join(';')];
                list.forEach(_x => {
                    if (_x.results) {
                        rows.push(ValidateCommand.resultToCsvRow(_x.results).join(';'))
                    } else {
                        let emptyRow = ValidateCommand.emptyCsvRow();
                        emptyRow[0] = _x.ip;
                        emptyRow[1] = _x.port;
                        rows.push(emptyRow.join(';'))
                    }
                });
                console.log(rows.join('\n'));
                break;

            default:
                break;
        }

        if(argv._resolve){
            return Promise.resolve(list)
        }else{
            return process.exit()
        }

        /*
        if(argv._resolve){

        }else{
            //process.exit(1)

        }*/


    }

    static resultToCsvRow(results: JudgeResults): any[] {
        return [
            results.ip,
            results.port,
            results.http.hasError() ? '"' + (results.http.error.toString()).replace('"', '""') + '"' : '',
            results.http.hasError() ? '"' + (results.http.error.code).replace('"', '""') + '"' : '',
            results.http.level,
            results.http.duration,
            '"' + results.http.logToString().replace('"', '""') + '"',
            results.https.hasError() ? '"' + (results.https.error.toString()).replace('"', '""') + '"' : '',
            results.https.hasError() ? '"' + (results.https.error.code).replace('"', '""') + '"' : '',
            results.https.level,
            results.https.duration,
            '"' + results.https.logToString().replace('"', '""') + '"',
            results.country_code,
            results.country_name,
            results.region_code,
            results.region_name,
            results.city,
            results.latitude,
            results.longitude
        ];
    }

    static emptyCsvRow(): any[] {
        return Array(ValidateCommand.csvHeader.length).fill('');
    }

    static csvHeader = [
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

    ]


}