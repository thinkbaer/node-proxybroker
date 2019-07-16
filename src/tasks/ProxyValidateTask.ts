import * as _ from 'lodash';
import {C_STORAGE_DEFAULT, Config, Incoming, Inject, ITask, Log, StorageRef, TodoException} from '@typexs/base';
import {K_PROXY_VALIDATOR, REGEX, TN_PROXY_VALIDATE} from '../libs/Constants';
import {ProxyData} from '../libs/proxy/ProxyData';
import {ProxyValidator} from '../libs/proxy/ProxyValidator';

export class ProxyValidateTask implements ITask {

  name = TN_PROXY_VALIDATE;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;


  @Incoming({
    handle: ProxyValidateTask.handle
  })
  proxies: ProxyData[] = [];

  @Incoming({optional: true})
  store = true;

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


  async exec() {
    if (this.proxies.length === 0) {
      return [];
    }
    const validatorCustomOptions = Config.get(K_PROXY_VALIDATOR, {});

    const proxyValidator = new ProxyValidator(validatorCustomOptions, this.store ? this.storageRef : null);

    let booted = false;
    try {
      booted = await proxyValidator.prepare();
    } catch (err) {
      Log.error(err);
      throw err;
    }

    if (booted) {
      try {
        let inc = 0;
        for (const _q of this.proxies) {
          inc++;
          proxyValidator.push(_q);
        }
        Log.info('Added ' + inc + ' proxies to check');
        await proxyValidator.await();
      } catch (err) {
        Log.error(err);
      }

      await proxyValidator.shutdown();

    } else {
      throw new TodoException();
    }


    return this.proxies;
  }

}
