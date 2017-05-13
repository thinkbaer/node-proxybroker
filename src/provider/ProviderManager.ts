import {IProviderOptions} from "./IProviderOptions";
import {IProviderDef} from "./IProviderDef";
import {importClassesFromDirectories} from "../utils/DirectoryExportedClassesLoader";
import {IProvider} from "./IProvider";
import {createObjectByType} from "../utils/ObjectUtils";
import {ProviderWorker} from "./ProviderWorker";
import {IQueue} from "../queue/IQueue";
import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import {IQueueProcessor} from "../queue/IQueueProcessor";


export class ProviderManager implements  IQueueProcessor<ProviderWorker> {

    options: IProviderOptions = null

    queue: IQueue;

    providers: Array<IProviderDef> = []


    constructor(options: IProviderOptions) {
        this.options = options
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
        let clazzes = importClassesFromDirectories(this.options.paths)
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
        return createObjectByType<IProvider>(obj);
    }


    findAll(query: {[_k:string]:string} = {}):Array<IProviderDef>{
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