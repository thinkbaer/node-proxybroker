import {Config} from "commons-config";
import {IStorageOptions} from "../storage/IStorageOptions";


export default class Bootstrap {


    constructor() {

    }


    initConfig() : Promise<void> {
        Config.options({
            configs: [
                {type: 'system'},
                // find in same directory proxybroker
                {type: 'file', file: {dirname: './', filename: 'proxybroker'}},
                // find in proxyborker
                {type: 'file', file: '${argv.configfile}'},
            ]
        })
        return Promise.resolve()
    }


    initStorage() : Promise<void>{
        let options = <IStorageOptions>Config.get('storage')

        return Promise.resolve()

    }



}
