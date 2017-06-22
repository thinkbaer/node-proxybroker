import {ReqResEvent} from "./ReqResEvent";
export class JudgeResult {
    error: boolean

    log: ReqResEvent[]

    start: Date

    stop: Date

    duration: number

    level: number
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