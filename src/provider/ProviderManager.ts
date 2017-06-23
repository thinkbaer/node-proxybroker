import {IProviderOptions} from "./IProviderOptions";
import {IProviderDef} from "./IProviderDef";

import {IProvider} from "./IProvider";

import {ProviderWorker} from "./ProviderWorker";
import {IQueue} from "../queue/IQueue";
import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import {IQueueProcessor} from "../queue/IQueueProcessor";
import {ClassLoader} from "../utils/ClassLoader";
import {IProxyDef} from "./IProxyDef";
import {FreeProxyListsCom} from "./predefined/FreeProxyListsCom";
import {StringOrFunction} from "../types";
import {Utils} from "../utils/Utils";

const DEFAULT_PROVIDER : StringOrFunction[] = [
    FreeProxyListsCom
]



const DEFAULT_OPTIONS:IProviderOptions = {
    //enable:true,
    providers:DEFAULT_PROVIDER
}

export class ProviderManager implements  IQueueProcessor<ProviderWorker> {

    options: IProviderOptions = DEFAULT_OPTIONS

    queue: IQueue;

    providers: Array<IProviderDef> = []


    constructor(options: IProviderOptions = {}, override:boolean = false) {
        if(override){
            this.options = Utils.clone(options)
        }else {
            this.options = Utils.merge(DEFAULT_OPTIONS,options)
        }

        this.options.parallel = this.options.parallel || 5
        this.queue = new AsyncWorkerQueue<ProviderWorker>(this)
    }


    /**
     * Implementation of queue processor method
     *
     * @param workLoad
     * @returns {null}
     */
    do(workLoad: ProviderWorker): Promise<void>{
        return null
    }

    propose(proxy: IProxyDef) : void{

    }



    init(): Promise<void> {
        let clazzes = ClassLoader.importClassesFromAny(this.options.providers)
        let self = this
        let clazzFn = clazzes.map(clazz => {
            return Promise.resolve(clazz).then(_clazz => {
                let tmp = self.newProviderFromObject(_clazz)

                if(tmp.variants){

                    tmp.variants.forEach(_variant => {
                        let proxyDef : IProviderDef = {
                            name: tmp.name,
                            url: tmp.url,
                            clazz: clazz,
                            ..._variant
                        }
                        self.providers.push(proxyDef)
                    })
                }else{
                    let proxyDef : IProviderDef = {
                        name:tmp.name,
                        url:tmp.url,
                        type: 'all',
                        clazz : clazz
                    }
                    self.providers.push(proxyDef)
                }
            })
        })


        return Promise
            .all(clazzFn)
            .then((proxyDefs) => {
                // Done
            })
    }


    private newProviderFromObject(obj: Function): IProvider {
        return ClassLoader.createObjectByType<IProvider>(obj);
    }


    findAll(query: {[_k:string]:string} = {}): IProviderDef[]{
        let ret:Array<IProviderDef> = []
        this.providers.forEach((value:IProviderDef) => {
            let _value: boolean = true
            Object.keys(query).forEach(k => {
                if(value[k] && query[k] && (value[k].localeCompare(query[k]) == 0 || value[k] === '_all_')){
                       _value = _value && true
                }else{
                    _value = _value && false
                }
            })

            if(_value){
                ret.push(value)
            }
        })

        return ret;
    }


    async createWorker(provider:IProviderDef): Promise<ProviderWorker> {
        let pw = new ProviderWorker(this, provider)
        await pw.initialize()
        return pw
    }






}