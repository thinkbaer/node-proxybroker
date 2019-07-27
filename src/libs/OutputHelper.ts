import {ProxyData} from './proxy/ProxyData';
import * as _ from 'lodash';
import {IProxyData} from './proxy/IProxyData';

export class OutputHelper {

  static toJson(proxyData: ProxyData[] | IProxyData[]) {
    const data: any = [];
    proxyData.forEach((_x: any) => {
      if (_x.results) {
        const copy: ProxyData = _.clone(_x);
        for (const res of copy.results.getVariants()) {
          if (res.hasError()) {
            continue;
          }
          const entry = {
            ip: copy.ip,
            port: copy.port,
            ...res
          };
          delete entry.id;
          delete entry.log;
          delete entry.error;
          // res.logStr = res.logToString();
          // if (res.hasError()) {
          //   res.error = <any>{message: res.error.message, code: res.error.code};
          // }
          // delete res.log;
          data.push(entry);
        }
      } else {
        data.push(_x);
      }
    });
    return data;
  }
}
