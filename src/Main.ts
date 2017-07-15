

import "reflect-metadata";
import {Storage} from "./storage/Storage";

import {Config} from "commons-config";
import {IStorageOptions} from "./storage/IStorageOptions";
import {ProxyFilter} from "./proxy/ProxyFilter";
import {ProxyValidator} from "./proxy/ProxyValidator";
import {EventBus} from "./events/EventBus";
import {IJudgeOptions} from "./judge/IJudgeOptions";
import {ProviderManager} from "./provider/ProviderManager";
import {ProxyServer} from "./server/ProxyServer";
import {Express} from "./server/Express";



class Main {

    storage : Storage;

    proxy_data_selector: ProxyFilter;

    proxy_validation_controller: ProxyValidator;

    proxy_manager: ProviderManager;

    proxy_server: ProxyServer;

    application: Express;


    async prepare(){

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
        });
        return Promise.resolve()
    }


    async initStorage() : Promise<void>{

        this.storage = await Storage.$();
        return Promise.resolve()

    }



    boot(){


        this.proxy_data_selector = new ProxyFilter(this.storage);
        EventBus.register(this.proxy_data_selector);

        let options:IJudgeOptions = Config.get('judge') || {};
        this.proxy_validation_controller = new ProxyValidator(options,this.storage)

    }


}

let main = new Main();
// main.boot()
