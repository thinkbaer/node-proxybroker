import {IProviderWorkerAPI} from "./IProviderWorkerAPI";
import {IProviderDef} from "./IProviderDef";
import {ProviderManager} from "./ProviderManager";
import {IProvider} from "./IProvider";

import {shorthash} from "../lib/crypt";
import {inspect} from "util"
import {IQueueWorkload} from "../queue/IQueueWorkload";
import {ClassLoader} from "../utils/ClassLoader";
import {IProxyDef} from "./IProxyDef";


export class ProviderWorker implements IProviderWorkerAPI, IQueueWorkload {

    private id: string;

    private _provider: IProviderDef = null

    private _manager: ProviderManager = null

    private _localInstance: IProvider = null

    private _status: number = 0

    constructor(manager: ProviderManager, provider: IProviderDef) {
        this.id = shorthash(inspect(provider))
        this._provider = provider
        this._manager = manager
        this._localInstance = ClassLoader.createObjectByType<IProvider>(provider.clazz)
    }


    async initialize(): Promise<void> {

        return Promise
            .resolve(this._localInstance)
            .then(_instance => {
                if(_instance['prepare']){
                    return _instance.prepare()
                }
                return null
            })
            .catch(err => {
                console.error(err)
                throw err
            })
    }


    propose(proxy: IProxyDef): void {
        this._manager.propose(proxy)
    }

}