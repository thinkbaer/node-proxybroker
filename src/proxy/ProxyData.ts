
import {IQueueWorkload} from "../queue/IQueueWorkload";
import {JudgeResults} from "../judge/JudgeResults";
import Todo from "../exceptions/Todo";
import * as _ from 'lodash'

export class ProxyData implements IQueueWorkload {

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