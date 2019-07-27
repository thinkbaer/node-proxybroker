import {ReqResEvent} from './ReqResEvent';
import {ProtocolType} from '../specific/ProtocolType';
import {NestedException} from '@typexs/base';


export class JudgeResult {

  error: NestedException = null;

  protocol_from: ProtocolType;

  protocol_to: ProtocolType;

  id: string;

  log: ReqResEvent[];

  start: Date;

  stop: Date;

  duration = -1;

  level = -2;

  logStr: string;

  constructor(from: ProtocolType, to: ProtocolType) {
    this.protocol_from = from;
    this.protocol_to = to;
  }


  hasError() {
    return this.error !== null;
  }


  logToString(sep: string = '\n'): string {
    const msg: Array<string> = [];

    this.log.sort(function (a: ReqResEvent, b: ReqResEvent) {
      return a.nr < b.nr ? (b.nr > a.nr ? -1 : 0) : 1;
    });

    let ignore_emtpy = false;
    for (const entry of this.log) {

      const str = (entry.prefix + ' ' + entry.message()).trim();
      if (str.length === 0 && ignore_emtpy) {
        continue;
      } else if (str.length === 0) {
        ignore_emtpy = true;
      } else {
        ignore_emtpy = false;
      }
      msg.push(str);
    }

    return msg.join(sep);
  }

}
