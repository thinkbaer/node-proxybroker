import {IProviderOptions} from "./IProviderOptions";
import {IProviderDef} from "./IProviderDef";
import {importClassesFromDirectories} from "../utils/DirectoryExportedClassesLoader";
import {IProxyProvider} from "./IProxyProvider";
import {createObjectByType} from "../utils/ObjectUtils";


export class ProviderManager {

    options: IProviderOptions = null

    providers: Array<IProviderDef> = []


    constructor(options: IProviderOptions) {
        this.options = options
    }


    init(): Promise<void> {
        let clazzes = importClassesFromDirectories(this.options.paths)
        let self = this
        let clazzFn = clazzes.map(clazz => {
            return Promise.resolve(clazz).then(_clazz => {
                let tmp = self.newProviderFromObject(_clazz)

                let proxyDef : IProviderDef = {
                    name:tmp.name,
                    url:tmp.url,
                    type:tmp.type,
                    clazz : clazz
                }

                self.providers.push(proxyDef)
            })
        })


        return Promise
            .all(clazzFn)
            .then((proxyDefs) => {
                // Done
            })
    }


    private newProviderFromObject(obj: Function): IProxyProvider {
        return createObjectByType<IProxyProvider>(obj);
    }


    findAll(query: {[_k:string]:string} = {}):Array<IProviderDef>{
        let ret:Array<IProviderDef> = []
        this.providers.forEach((value:IProviderDef) => {
            let _value: boolean = true
            Object.keys(query).forEach(k => {
                if(value[k] && query[k] && value[k].localeCompare(query[k]) == 0){
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


}