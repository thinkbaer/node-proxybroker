import {JudgeResult} from "./JudgeResult";
import {ProtocolType} from "../libs/specific/ProtocolType";
import * as _ from 'lodash'


export class JudgeResults {

    protocol: ProtocolType = ProtocolType.HTTP;

    host: string;

    ip: string;

    port: number;

    geo: boolean;

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

    variants: JudgeResult[] = [];


    detectProtocol(){

    }


    getVariant(src:ProtocolType, dest:ProtocolType): JudgeResult {
        return _.find(this.variants,{protocol_from:src,protocol_to:dest})
    }

    getVariants(): JudgeResult[] {
        this.variants.sort(function (a: JudgeResult, b: JudgeResult) {
            if (a.protocol_from < b.protocol_from) {
                return -1
            } else if (a.protocol_from > b.protocol_from) {
                return 1
            } else {
                return a.protocol_to < b.protocol_to ? -1 : (a.protocol_to > b.protocol_to ? 1 : 0)
            }
        })

        return this.variants
    }


}