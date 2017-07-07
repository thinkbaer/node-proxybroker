import {IProviderDef} from "./IProviderDef";
import {ProviderManager} from "./ProviderManager";


import {shorthash} from "../lib/crypt";
import {inspect} from "util"
import {IQueueWorkload} from "../queue/IQueueWorkload";
import {ClassLoader} from "../utils/ClassLoader";
import {IProxyData} from "../proxy/IProxyData";
import {AbstractProvider} from "./AbstractProvider";
import {Log} from "../logging/Log";


export class ProviderWorker implements IQueueWorkload {

    private id: string;

    private _provider: IProviderDef = null

    private _manager: ProviderManager = null

    private _localInstance: AbstractProvider = null

    private _status: number = 0

    constructor(manager: ProviderManager, provider: IProviderDef) {
        this.id = shorthash(inspect(provider))
        this._provider = provider
        this._manager = manager
        this._localInstance = ClassLoader.createObjectByType<AbstractProvider>(provider.clazz)
        this._localInstance.selectVariant(provider);
    }


    async initialize(): Promise<void> {
        try{
            if(this._localInstance.prepare){
               await  this._localInstance.prepare
            }
        }catch(err){
            Log.error(err)
            throw err
        }
        return Promise.resolve()
    }



    async fetch():Promise<IProxyData[]>{
        return await this._localInstance.get()
    }

}