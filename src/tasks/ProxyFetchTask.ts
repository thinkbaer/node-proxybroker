import * as _ from 'lodash';
import {Incoming, Inject, ITask, Outgoing} from '@typexs/base';
import {ProviderManager} from '../libs/provider/ProviderManager';
import {__ALL__, TN_PROXY_FETCH} from '../libs/Constants';
import {IProxyData} from '../libs/proxy/IProxyData';

export class ProxyFetchTask implements ITask {

  name = TN_PROXY_FETCH;

  @Inject(ProviderManager.NAME)
  providerManager: ProviderManager;

  @Incoming()
  provider: string;

  @Incoming({
    optional: true,
    handle: (v => {
      if (_.isString(v)) {
        return v.split(',').map(x => x.trim());
      } else {
        return v;
      }
    })
  })
  variants: string[] = [__ALL__];

  @Outgoing()
  proxies: IProxyData[] = [];

  async exec() {
    const all = this.variants.indexOf(__ALL__) > -1;
    const variants = this.providerManager.findAll({name: this.provider});
    if (variants.length > 0) {
      for (const v of variants) {
        if (all || this.variants.indexOf(v.type) > -1) {
          console.error('Variant name: ' + v.name + ';  variant: ' + v.type + ' on ' + v.url);
          // tslint:disable-next-line:no-shadowed-variable
          const variant = this.providerManager.get(v);
          const worker = await this.providerManager.createWorker(variant);
          const p = await worker.fetch();
          this.proxies = _.concat(this.proxies, p);
        }
      }
    }
    return this.proxies;
  }

}
