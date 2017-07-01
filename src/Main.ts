

import "reflect-metadata";
import {Storage} from "./storage/Storage";

import {Config} from "commons-config";
import {IStorageOptions} from "./storage/IStorageOptions";
import {ProxyDataSelector} from "./proxy/ProxyDataSelector";
import {ProxyValidationController} from "./proxy/ProxyValidationController";
import {EventBus} from "./events/EventBus";
import {IJudgeOptions} from "./judge/IJudgeOptions";



class Main {

    storage : Storage

    proxy_data_selector: ProxyDataSelector

    proxy_validation_controller: ProxyValidationController


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


    async initStorage() : Promise<void>{

        this.storage = await Storage.$()
        return Promise.resolve()

    }



    boot(){


        this.proxy_data_selector = new ProxyDataSelector(this.storage)
        EventBus.register(this.proxy_data_selector)

        let options:IJudgeOptions = Config.get('judge') || {}
        this.proxy_validation_controller = new ProxyValidationController(options)

    }


}

let main = new Main()
// main.boot()
