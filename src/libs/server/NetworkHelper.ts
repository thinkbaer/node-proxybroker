import * as _ from 'lodash';
import * as net from 'net';
import {ILoggerApi, IUrlBase} from '@typexs/base';

export class NetworkHelper {

  static pipeConnection(url: IUrlBase, upstream: net.Socket, head: Buffer | string, options: { logger: ILoggerApi }) {
    const downstream = net.connect(url.port, url.hostname, () => {
      if (_.has(options, 'logger')) {
        options.logger.debug('downstream over proxy connected to ' + '' + url.hostname + ':' + url.port);
      }

      if (head) {
        downstream.write(head, err => {
          if (err && _.has(options, 'logger')) {
            options.logger.error(err);
          }
        });
      }
      downstream
      // .pipe(new Transform({
      //   transform(chunk: any, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
      //     console.log(chunk.toString());
      //     callback(null, chunk);
      //   }
      // }))
        .pipe(upstream);
      upstream
      // .pipe(new Transform({
      //   transform(chunk: any, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
      //     console.log(chunk.toString());
      //     callback(null, chunk);
      //   }
      // }))
        .pipe(downstream);
    });
    return downstream;
  }
}
