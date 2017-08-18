
import {Get, JsonController, Param} from "routing-controllers";
import {Inject} from "typedi";
import {ProviderManager} from "../../../provider/ProviderManager";
import {IProviderVariant} from "../../../provider/IProviderVariant";
import {Utils} from "../../../libs/generic/utils/Utils";
import {Config, IConfigData} from "commons-config";
import {Runtime} from "../../../libs/generic/Runtime";
import {ProviderRunEvent} from "../../../provider/ProviderRunEvent";
import {Statistics} from "../../../libs/specific/storage/Statistics";
import {Storage} from "../../../libs/generic/storage/Storage";
import {Loader} from "../../../Loader";


@JsonController()
export class DataAccessController {

    @Inject()
    private providerManager: ProviderManager


    @Get("/config")
    config(): IConfigData {
        return Runtime.$().getConfig()
    }

    @Get("/stats")
    stats(): any {
        return Loader._().stats()
    }

    @Get("/status")
    status(): any {
        return Loader._().status()
    }


    @Get("/providers")
    providers(): any {
        return this.providerManager.list();
    }

    @Get("/provider/:name/:type/run")
    providerRun(@Param('name') name:string, @Param('type') type:string): Promise<any> {
        let p = new ProviderRunEvent({name:name,type:type})
        return p.fire()
    }

}