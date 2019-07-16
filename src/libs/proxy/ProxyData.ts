import {JudgeResults} from '../judge/JudgeResults';
import * as _ from 'lodash';
import {IProxyData} from './IProxyData';
import {IQueueWorkload, TodoException} from '@typexs/base';
import {IpAddr} from '../../entities/IpAddr';

export class ProxyData implements IQueueWorkload, IProxyData {

  ip: string;

  port: number;

  results: JudgeResults = null;


  constructor(ip: string | IProxyData | IpAddr, port?: number) {
    if (_.isString(ip) && port) {
      this.ip = ip;
      this.port = port;
    } else if (_.isObject(ip)) {
      this.ip = ip.ip;
      this.port = ip.port;
    } else {
      // TODO test string with :
      throw new TodoException();
    }

  }


}
