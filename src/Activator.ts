import {Container,IActivator} from "@typexs/base";
import {ServerFactory} from "@typexs/server";
import {ProxyServer} from "./libs/server/ProxyServer";


export class Activator implements IActivator{
  startup(): void {
    ServerFactory.register('proxyserver',ProxyServer);
  }
}
