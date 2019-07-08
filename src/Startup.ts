import {
  Container,
  IBootstrap,
  IShutdown,
  RuntimeLoader,
  Inject,
  C_STORAGE_DEFAULT,
  Config,
  StorageRef
} from "@typexs/base";
import {MODUL_TOPIC_PROXY_PROVIDER} from "./libs/Constants";
import {ClassType} from "commons-http/libs/Constants";
import {AbstractProvider} from "./libs/provider/AbstractProvider";
import {StartupHelper} from "./libs/StartupHelper";
import {ProviderManager} from "./libs/provider/ProviderManager";
import {IProviderOptions} from "./libs/provider/IProviderOptions";


export class Startup implements IBootstrap, IShutdown {

  @Inject(RuntimeLoader.NAME)
  runtimeLoader: RuntimeLoader;


  async bootstrap() {
    if (!StartupHelper.isEnabled()) {
      return;
    }
let all = Config.all();
    let providerOptions: IProviderOptions = Config.get('proxybroker.provider', {});

    const storageRef: StorageRef = Container.get(C_STORAGE_DEFAULT);
    let providerManager: ProviderManager = Container.get(ProviderManager.NAME);
    const proxyProviders = <ClassType<AbstractProvider>[]>this.runtimeLoader.getClasses(MODUL_TOPIC_PROXY_PROVIDER);
    for (let proxyProvider of proxyProviders) {
      providerManager.addProviderClass(proxyProvider);
    }

    await providerManager.prepare(storageRef, providerOptions, true);
  }


  async shutdown() {
    if (!StartupHelper.isEnabled()) {
      return;
    }
    let providerManager: ProviderManager = Container.get(ProviderManager.NAME);
    await providerManager.shutdown()
  }

}
