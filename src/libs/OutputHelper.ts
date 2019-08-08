import {TodoException} from '@typexs/base';
import {IProxyResult} from './proxy/IProxyResult';
import * as _ from 'lodash';
import {IProxyData} from './proxy/IProxyData';

export class OutputHelper {

  static printResults(results: IProxyData[] | IProxyResult[], format: 'json' | 'csv' = 'json') {
    switch (format) {
      case 'json':
        console.log(JSON.stringify(results, null, 2));
        break;
      case 'csv':
        let rows: string[] = [];
        if (results.length > 0) {
          if (_.has(results[0], 'protocol')) {
            rows.push(['protocol', 'ip', 'port', 'enabled', 'level', 'duration'].join(';'));
          } else {
            rows.push(['ip', 'port'].join(';'));
          }
          results.forEach(_rowData => {
            if (_.has(_rowData, 'protocol')) {
              const entry = _rowData as IProxyResult;
              rows.push([entry.protocol, entry.ip, entry.port, entry.enabled, entry.level, entry.duration].join(';'));
            } else {
              rows.push([_rowData.ip, _rowData.port].join(';'));
            }
          });
          rows = _.uniq(rows);
        }
        console.log(rows.join('\n'));
        break;
      default:
        throw new TodoException();
    }


  }

// <
//   static toJson(proxies: IProxyData[] | IProxyResult[]) {
//     const data: any = [];
//     for (const proxy of proxies) {
//
//       // if (_x.results) {
//       //   const copy: ProxyData = _.clone(_x);
//       //   for (const res of copy.results.getVariants()) {
//       //     if (res.hasError) {
//       //       continue;
//       //     }
//       //     const entry = {
//       //       ip: copy.ip,
//       //       port: copy.port,
//       //       ...res
//       //     };
//       //     delete entry.id;
//       //     delete entry.log;
//       //     delete entry.error;
//       //     // res.logStr = res.logToString();
//       //     // if (res.hasError()) {
//       //     //   res.error = <any>{message: res.error.message, code: res.error.code};
//       //     // }
//       //     // delete res.log;
//       //     data.push(entry);
//       //   }
//       // } else {
//       //   data.push(_x);
//       // }
//     }
//     return data;
//   }>
}
