import {IQueueWorkload} from "../queue/IQueueWorkload";
import {JudgeResults} from "../judge/JudgeResults";
import Todo from "../exceptions/TodoException";
import * as _ from 'lodash'
import {IProxyData} from "./IProxyData";
import {IpAddr} from "../model/IpAddr";

export class ProxyData implements IQueueWorkload, IProxyData {

    ip: string;

    port: number;

    job_state_id: number = null;

    results: JudgeResults = null;


    constructor(ip: string | IProxyData | IpAddr, port?: number, job_state_id?: number) {
        if (_.isString(ip) && port) {
            this.ip = ip;
            this.port = port;
            this.job_state_id = job_state_id
        } else if (_.isObject(ip)) {
            if (ip instanceof IpAddr) {
                this.ip = ip['ip'];
                this.port = ip['port'];
            } else {
                this.ip = ip['ip'];
                this.port = ip['port'];
                this.job_state_id = ip['job_state_id']
            }
        } else {
            // TODO test string with :
            throw new Todo()
        }

    }


}