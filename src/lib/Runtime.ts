

import {Config, IConfigData} from "commons-config";
export class Runtime {

    private static runtime:Runtime = null

    static $():Runtime{
        if(!this.runtime){
            this.runtime = new Runtime()
        }
        return this.runtime
    }


    setConfig(key:string,data:any){
        let _data = {}
        _data[key] = data
        Config.jar('_runtime_').merge(_data)
    }

    getConfig() : IConfigData{
        return Config.jar('_runtime_').data
    }

}
