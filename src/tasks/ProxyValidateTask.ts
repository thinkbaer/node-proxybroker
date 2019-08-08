import * as _ from 'lodash';
import {C_STORAGE_DEFAULT, Incoming, Inject, ITask, Log, StorageRef} from '@typexs/base';
import {REGEX, TN_PROXY_VALIDATE} from '../libs/Constants';
import {ProxyData} from '../libs/proxy/ProxyData';
import {ProxyValidator} from '../libs/proxy/ProxyValidator';
import {LockFactory} from '@typexs/base/libs/LockFactory';

export class ProxyValidateTask implements ITask {

  name = TN_PROXY_VALIDATE;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  @Inject(ProxyValidator.NAME)
  validator: ProxyValidator;


  @Incoming({
    handle: ProxyValidateTask.handle
  })
  proxies: ProxyData[] = [];

  @Incoming({optional: true})
  store = true;

  semaphore = LockFactory.$().semaphore(10000);

  // emitter = new EventEmitter();

  // todo: ProxyData[] = [];

  // _send = 0;

  // _done = 0;

  static handle(value: any) {
    if (_.isString(value)) {
      // can be file or url
      const proxyData: ProxyData[] = [];
      for (const v of value.split(/,|\n/)) {
        if (REGEX.test(v)) {
          const matched = v.match(REGEX);
          let schema = 'http';
          let ip = '127.0.0.1';
          let port = 3128;

          if (matched) {
            if (matched[1] && matched[2]) {
              // http or https exists
              schema = matched[2];
            }
            ip = matched[3];
            if (matched[4]) {
              // port
              port = parseInt(matched[4], 0);
            }
          }
          proxyData.push(new ProxyData(ip, port));
        } else {
          throw new Error('unknown data');
        }
      }
      return proxyData;
    }
    return value;
  }


  // async await() {
  //   return new Promise(resolve => {
  //     this.emitter.once('finished', resolve);
  //   });
  // }
  //
  //
  // async pause() {
  //   if (this._send % 1000 === 0) {
  //     return new Promise(resolve => {
  //       this.emitter.once('resume', resolve);
  //     });
  //   } else {
  //     return Promise.resolve();
  //   }
  // }
  //
  //
  // done(c: ProxyData) {
  //   _.remove(this.todo, x => x.ip === c.ip && x.port === c.port);
  //   this._done++;
  //   if (this.todo.length === 0) {
  //     this.emitter.emit('finished');
  //   }
  //   Log.debug('validate task: ' + this._send + ' / ' + this._done + ' / ' + this.todo.length);
  //   if (this._send - this._done < 1000) {
  //     this.emitter.emit('resume');
  //   }
  //
  // }

  async exec() {
    if (this.proxies.length === 0) {
      return [];
    }

    try {
      for (const _q of this.proxies) {
        //      this._send++;
        await this.semaphore.acquire();
        this.validator.push(_.clone(_q))
          .then(value => {
            return value.done();
          })
          .catch(reason => {
            Log.error(reason);
          })
          .finally(() => {
            this.semaphore.release();
          });
        // await this.pause();
      }
      await this.validator.isEmpty();
    } catch (err) {
      Log.error(err);
    }

    return this.proxies;
  }

}
