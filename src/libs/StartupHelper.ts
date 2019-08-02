import {Config} from 'commons-config';
import * as _ from 'lodash';
import {K_PROXYSERVER} from './server/IProxyServerOptions';


export class StartupHelper {

  static isEnabled() {
    return Config.get('proxy-broker.startup', false);
  }

  static getProxyServerConfigs() {
    const serversCfg = Config.get('server', {});
    return _.keys(serversCfg).map(key => {
      const c = serversCfg[key];
      c.name = key;
      return c;
    }).filter(x => x.type === K_PROXYSERVER);

  }
}
