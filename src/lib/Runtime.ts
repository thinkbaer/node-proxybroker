

import {Config, ConfigJar, IConfigData} from "commons-config";
export class Runtime {

    private static runtime:Runtime = null

    private jar: ConfigJar;

    static $():Runtime{
        if(!this.runtime){
            this.runtime = new Runtime()
        }
        return this.runtime
    }

    constructor(){
        this.jar = new ConfigJar()
    }


    setConfig(key:string,data:any){
        let _data = {}
        _data[key] = data
        this.jar.merge(_data)
    }

    getConfig() : IConfigData{
        return this.jar.data
    }

}
