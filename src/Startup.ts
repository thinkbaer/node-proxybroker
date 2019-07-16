import {Config, Container, IBootstrap, Inject, IShutdown, RuntimeLoader} from '@typexs/base';
import {MODUL_TOPIC_PROXY_PROVIDER} from './libs/Constants';
import {ClassType} from 'commons-http/libs/Constants';
import {AbstractProvider} from './libs/provider/AbstractProvider';
import {StartupHelper} from './libs/StartupHelper';
import {ProviderManager} from './libs/provider/ProviderManager';
import {IProviderOptions} from './libs/provider/IProviderOptions';


export class Startup implements IBootstrap, IShutdown {


  @Inject(RuntimeLoader.NAME)
  runtimeLoader: RuntimeLoader;

  async bootstrap() {


    if (!StartupHelper.isEnabled()) {
      return;
    }
    // const all = Config.all();
    const providerOptions: IProviderOptions = Config.get('proxybroker.provider', {});

    // const storageRef: StorageRef = Container.get(C_STORAGE_DEFAULT);
    const providerManager: ProviderManager = Container.get(ProviderManager.NAME);
    const proxyProviders = <ClassType<AbstractProvider>[]>this.runtimeLoader.getClasses(MODUL_TOPIC_PROXY_PROVIDER);
    for (const proxyProvider of proxyProviders) {
      providerManager.addProviderClass(proxyProvider);
    }

    await providerManager.prepare(providerOptions, true);


  }


  async shutdown() {
    if (!StartupHelper.isEnabled()) {
      return;
    }
    const providerManager: ProviderManager = Container.get(ProviderManager.NAME);
    await providerManager.shutdown();
  }

}
