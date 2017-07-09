
import {Get, JsonController, Param} from "routing-controllers";
import {Inject} from "typedi";
import {ProviderManager} from "../../../provider/ProviderManager";
import {IProviderVariant} from "../../../provider/IProviderVariant";
import {Utils} from "../../../utils/Utils";
import {Config, IConfigData} from "commons-config";
import {Runtime} from "../../../lib/Runtime";
import {ProviderRunEvent} from "../../../provider/ProviderRunEvent";


@JsonController()
export class DataAccessController {

    //@Inject()
    //private storage: Storage

    @Inject()
    private providerManager: ProviderManager


    @Get("/config")
    config(): IConfigData {
        return Runtime.$().getConfig()
    }


    @Get("/providers")
    providers(): IProviderVariant[] {
        let list:IProviderVariant[] = []
        this.providerManager.findAll().forEach(_x => {
            let y = Utils.clone(_x)
            // delete y['clazz']
            list.push(<IProviderVariant>y)
        })
        return list
    }

    @Get("/provider/:name/:type/run")
    providerRun(@Param('name') name:string, @Param('type') type:string): Promise<any> {
        let p = new ProviderRunEvent({name:name,type:type})
        return p.fire()
    }

}