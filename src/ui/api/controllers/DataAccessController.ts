
import {Get, JsonController} from "routing-controllers";
import {Inject} from "typedi";
import {ProviderManager} from "../../../provider/ProviderManager";
import {IProviderDef} from "../../../provider/IProviderDef";
import {Storage} from "../../../storage/Storage";
import {IProviderVariant} from "../../../provider/IProviderVariant";
import {Utils} from "../../../utils/Utils";


@JsonController()
export class DataAccessController {

    //@Inject()
    //private storage: Storage

    @Inject()
    private providerManager: ProviderManager


    @Get("/providers")
    providers(): IProviderVariant[] {
        let list:IProviderVariant[] = []
        this.providerManager.findAll().forEach(_x => {
            let y = Utils.clone(_x)
            delete y['clazz']
            list.push(<IProviderVariant>y)
        })
        return list
      //  return [{name:'test',type:'test2',url:'asd',clazz:function(){}}]
    }

}