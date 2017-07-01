
import {IQueueWorkload} from "../queue/IQueueWorkload";
import {JudgeResults} from "../judge/JudgeResults";
import Todo from "../exceptions/TodoException";
import * as _ from 'lodash'
import {IProxyData} from "./IProxyData";
import {IpAddr} from "../storage/entity/IpAddr";

export class ProxyData implements IQueueWorkload, IProxyData {

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