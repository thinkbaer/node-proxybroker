import {Judge} from "../judge/Judge";

import StdConsole from "./StdConsole";
import {Log} from "../logging/Log";
import {PlatformUtils} from "../utils/PlatformUtils";
import * as fs from 'fs'
import * as _ from 'lodash'
import {IQueueWorkload} from "../queue/IQueueWorkload";
import {IQueueProcessor} from "../queue/IQueueProcessor";
import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import Todo from "../../test/exceptions/Todo";
import {JudgeResults} from "../judge/JudgeResults";


class ProxyData implements IQueueWorkload {

    ip: string
    port: number
    results: JudgeResults = null


    constructor(ip: string | { ip: string, port: number }, port?: number) {
        if (_.isString(ip) && port) {
            this.ip = ip
            this.port = port

        } else if (_.isObject(ip)) {
            this.ip = ip['ip']
            this.port = ip['port']
        } else {
            // TODO test string with :
            throw new Todo()
        }
    }
}


class ProxyValidator implements IQueueProcessor<ProxyData> {

    private judge: Judge = null

    constructor(judge: Judge) {
        this.judge = judge
    }

    async do(workLoad: ProxyData): Promise<void> {
        let results = await this.judge.validate(workLoad.ip, workLoad.port)
        workLoad.results = results

    }


    onEmpty(): Promise<void> {
        return null;
    }
}


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
            .default('outputformat','json')
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
                let parallel: number = 5

                let judge = new Judge()
                let booted = await judge.bootstrap()
                if (booted) {


                    await judge.wakeup()
                    try {
                        let p = new ProxyValidator(judge)
                        let q = new AsyncWorkerQueue<ProxyData>(p, {concurrent: parallel})
                        list.forEach(_q => {
                            q.push(_q)
                        })

                        Log.error('PRE AWAIT')
                        await q.await()
                        Log.error('AFTER AWAIT')
                    } catch (err) {
                        Log.error(err)
                    }

                    await judge.pending()

                    switch (argv.outputformat){
                        case 'json':
                            let data: JudgeResults[] = []
                            list.forEach(_x => {
                                _x.results.http.log = null
                                _x.results.https.log = null
                                data.push(_x.results)
                            })

                            console.log(JSON.stringify(data, null, 2))
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
            // TODO check this
        }
        /*
         */
    }
}

