import {ReqResEvent} from "./ReqResEvent";
import {NestedException} from "../exceptions/NestedException";
export class JudgeResult {
    error: NestedException = null

    id:string


    log: ReqResEvent[]

    start: Date

    stop: Date

    duration: number

    level: number

    logStr: string

    hasError(){
        return this.error !== null
    }


    logToString(sep: string = "\n"): string {
        let msg: Array<string> = []

        this.log.sort(function (a: ReqResEvent, b: ReqResEvent) {
            return a.nr < b.nr ? (b.nr > a.nr ? -1 : 0) : 1
        })

        let ignore_emtpy = false
        for (let entry of this.log) {
            let str = (entry.direction + ' ' + entry.message).trim()
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

export class JudgeResults {

    host:string

    ip: string

    port: number

    geo:boolean

    country_code: string

    country_name: string

    region_code: string

    region_name: string

    city: string

    zip_code: string

    time_zone: string

    latitude: number

    longitude: number

    metro_code: number

    http: JudgeResult = new JudgeResult()

    https: JudgeResult = new JudgeResult()
}