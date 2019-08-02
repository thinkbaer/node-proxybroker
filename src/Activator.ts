import './libs/overrides/https_proxy_agent';

import {Config, Container, IActivator} from '@typexs/base';
import {ServerFactory} from '@typexs/server/libs/server/ServerFactory';
import {ProxyServer} from './libs/server/ProxyServer';
import {ProviderManager} from './libs/provider/ProviderManager';
import {StartupHelper} from './libs/StartupHelper';
import {ProxyValidator} from './libs/proxy/ProxyValidator';
import {IProxyValidatiorOptions} from './libs/proxy/IProxyValidatiorOptions';
import {CFG_PROXY_VALIDATOR} from './libs/Constants';
import * as _ from 'lodash';
import {ProxyRotator} from './libs/proxy/ProxyRotator';
import {PROXY_ROTATOR_SERVICE} from './libs/proxy/IProxyRotator';


export class Activator implements IActivator {

  async startup() {
    ServerFactory.register('proxyserver', ProxyServer);
    // TODO enable
    if (!StartupHelper.isEnabled()) {
      return;
    }
    const providerManager = new ProviderManager();
    Container.set(ProviderManager.NAME, providerManager);

    /**
     * ProxyValidator enable
     */
    const validatorCustomOptions: IProxyValidatiorOptions = Config.get(CFG_PROXY_VALIDATOR, {});
    if (!_.isEmpty(validatorCustomOptions)) {
      const proxyValidator = new ProxyValidator();
      Container.set(ProxyValidator.NAME, proxyValidator);
    } else {
      Container.set(ProxyValidator.NAME, null);
    }

    /**
     * If proxy server then add default rotator
     */
    const proxyServerConfig = StartupHelper.getProxyServerConfigs();
    if (!_.isEmpty(proxyServerConfig)) {
      const rotator = Container.get(ProxyRotator);
      Container.set(PROXY_ROTATOR_SERVICE, rotator);
    }

  }
}
