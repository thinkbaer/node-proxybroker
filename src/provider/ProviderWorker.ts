import {IProviderWorkerAPI} from "./IProviderWorkerAPI";
import {IProviderDef} from "./IProviderDef";
import {ProviderManager} from "./ProviderManager";
import {IProvider} from "./IProvider";
import {createObjectByType} from "../utils/ObjectUtils";
import {shorthash} from "../lib/crypt";
import {inspect} from "util"


export class ProviderWorker implements IProviderWorkerAPI {

    private id: string;

    private _provider: IProviderDef = null

    private _manager: ProviderManager = null

    private _localInstance: IProvider = null

    private _status: number = 0

    constructor(manager: ProviderManager, provider: IProviderDef) {

        this.id = shorthash(inspect(provider))
        console.log(provider,this.id)
        this._provider = provider
        this._manager = manager
        this._localInstance = createObjectByType<IProvider>(provider.clazz)
    }


    initialize(): Promise<void> {
        return Promise
            .resolve(this._localInstance)
            .then(_instance => {
                if(_instance['prepare']){
                    return _instance.prepare()
                }
            })
            .catch(err => {
                console.error(err)
                throw err
            })
    }


    propose(proxy: IProxyDef): void {
    }

}