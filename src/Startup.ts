import * as _ from 'lodash';
import {C_STORAGE_DEFAULT, Config, Container, IBootstrap, Inject, IPermissions, IShutdown, RuntimeLoader, StorageRef} from '@typexs/base';
import {
  CFG_PROXY_PROVIDERS_CONFIG_ROOT,
  CFG_PROXY_VALIDATOR,
  MODUL_TOPIC_PROXY_PROVIDER,
  PERMISSION_ACCESS_PROXY_BROKER_CONTENT
} from './libs/Constants';
import {ClassType} from 'commons-http/libs/Constants';
import {AbstractProvider} from './libs/provider/AbstractProvider';
import {StartupHelper} from './libs/StartupHelper';
import {ProviderManager} from './libs/provider/ProviderManager';
import {IProviderOptions} from './libs/provider/IProviderOptions';
import {Scheduler} from '@typexs/base/libs/schedule/Scheduler';
import {ProxyValidator} from './libs/proxy/ProxyValidator';
import {IProxyValidatiorOptions} from './libs/proxy/IProxyValidatiorOptions';
import {EventBus} from 'commons-eventbus';


export class Startup implements IBootstrap, IShutdown, IPermissions {

  @Inject(Scheduler.NAME)
  scheduler: Scheduler;

  @Inject(RuntimeLoader.NAME)
  runtimeLoader: RuntimeLoader;

  @Inject(ProxyValidator.NAME)
  proxyValidator: ProxyValidator;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  async bootstrap() {
    if (!StartupHelper.isEnabled()) {
      return;
    }
    const providerOptions: IProviderOptions = Config.get(CFG_PROXY_PROVIDERS_CONFIG_ROOT, {});
    const providerManager: ProviderManager = Container.get(ProviderManager.NAME);
    const proxyProviders = <ClassType<AbstractProvider>[]>this.runtimeLoader.getClasses(MODUL_TOPIC_PROXY_PROVIDER);
    for (const proxyProvider of proxyProviders) {
      providerManager.addProviderClass(proxyProvider);
    }
    await providerManager.prepare(providerOptions, true);

    /**
     * ProxyValidator enable
     */
    const validatorCustomOptions: IProxyValidatiorOptions = Config.get(CFG_PROXY_VALIDATOR, {});
    if (!_.isEmpty(validatorCustomOptions)) {
      this.proxyValidator.initialize(validatorCustomOptions, this.storageRef);
      await this.proxyValidator.prepare();
    }
  }


  async shutdown() {
    if (!StartupHelper.isEnabled()) {
      return;
    }
    const providerManager: ProviderManager = Container.get(ProviderManager.NAME);
    await providerManager.shutdown();

    if (this.proxyValidator) {
      await this.proxyValidator.shutdown();
    }

  }


  permissions(): Promise<string[]> | string[] {
    return [PERMISSION_ACCESS_PROXY_BROKER_CONTENT];
  }

}
