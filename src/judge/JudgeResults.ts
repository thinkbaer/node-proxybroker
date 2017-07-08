
import {JudgeResult} from "./JudgeResult";
import {ProtocolType} from "../lib/ProtocolType";
export class JudgeResults {

    host:string;

    ip: string;

    port: number;

    geo:boolean;

    country_code: string;

    country_name: string;

    region_code: string;

    region_name: string;

    city: string;

    zip_code: string;

    time_zone: string;

    latitude: number;

    longitude: number;

    metro_code: number;

    http: JudgeResult = new JudgeResult(ProtocolType.HTTP);

    https: JudgeResult = new JudgeResult(ProtocolType.HTTPS)
}