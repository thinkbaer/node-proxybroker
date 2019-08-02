import {Get, JsonController, Param} from 'routing-controllers';
import {Inject} from 'typedi';
import {Access, ContextGroup} from '@typexs/server';
import {ProviderManager} from '../libs/provider/ProviderManager';
import {API_URL_PROXYBROKER, PERMISSION_ACCESS_PROXY_BROKER_CONTENT} from '../libs/Constants';

@ContextGroup('api')
@JsonController(API_URL_PROXYBROKER)
export class ProxyBrokerController {

  @Inject()
  private providerManager: ProviderManager;

  @Access(PERMISSION_ACCESS_PROXY_BROKER_CONTENT)
  @Get('/providers')
  providers(): any {
    return this.providerManager.findAll();
  }

  @Access(PERMISSION_ACCESS_PROXY_BROKER_CONTENT)
  @Get('/provider/:name/:type/run')
  providerRun(@Param('name') name: string, @Param('type') type: string): Promise<any> {
    return null;
  }

}
