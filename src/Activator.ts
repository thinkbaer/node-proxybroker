import './libs/overrides/https_proxy_agent';

import {Container, IActivator} from '@typexs/base';
import {ServerFactory} from '@typexs/server/libs/server/ServerFactory';
import {ProxyServer} from './libs/server/ProxyServer';
import {ProviderManager} from './libs/provider/ProviderManager';
import {StartupHelper} from './libs/StartupHelper';


export class Activator implements IActivator {

  async startup() {
    ServerFactory.register('proxyserver', ProxyServer);
    // TODO enable
    if (!StartupHelper.isEnabled()) {
      return;
    }
    const providerManager = new ProviderManager();
    Container.set(ProviderManager.NAME, providerManager);
  }
}
