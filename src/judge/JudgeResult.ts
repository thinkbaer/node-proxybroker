import {ReqResEvent} from "./ReqResEvent";
import {NestedException} from "../exceptions/NestedException";
import {ProtocolType} from "../lib/ProtocolType";


export class JudgeResult {
    error: NestedException = null;

    protocol: ProtocolType;

    id:string;


    log: ReqResEvent[];

    start: Date;

    stop: Date;

    duration: number;

    level: number;

    logStr: string;

    constructor(type:ProtocolType){
        this.protocol = type
    }

    hasError(){
        return this.error !== null
    }


    logToString(sep: string = "\n"): string {
        let msg: Array<string> = [];

        this.log.sort(function (a: ReqResEvent, b: ReqResEvent) {
            return a.nr < b.nr ? (b.nr > a.nr ? -1 : 0) : 1
        });

        let ignore_emtpy = false;
        for (let entry of this.log) {

            let str = (entry.prefix + ' ' + entry.message()).trim();
            if(str.length == 0 && ignore_emtpy){
                continue
            }else if(str.length == 0){
                ignore_emtpy = true
            }else{
                ignore_emtpy = false
            }
            msg.push(str)
        }

        return msg.join(sep)
    }

}
