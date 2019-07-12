import {Get, JsonController, Param} from 'routing-controllers';
import {Inject} from 'typedi';
import {ContextGroup} from '@typexs/server';
import {ProviderManager} from '../libs/provider/ProviderManager';

@ContextGroup('api')
@JsonController('/proxybroker')
export class DataAccessController {

  @Inject()
  private providerManager: ProviderManager;


  @Get('/providers')
  providers(): any {
    return this.providerManager.list();
  }

  @Get('/provider/:name/:type/run')
  providerRun(@Param('name') name: string, @Param('type') type: string): Promise<any> {
//        let p = new ProviderRunEvent({name:name,type:type})
//        return p.fire()
    return null;
  }

}
