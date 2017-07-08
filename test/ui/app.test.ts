import "reflect-metadata";
import {useContainer} from "routing-controllers";
import {Container} from "typedi";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Storage} from "../../src/storage/Storage";
import {ProviderManager} from "../../src/provider/ProviderManager";
import {Express} from "../../src/ui/Express";



let boot = async function ():Promise<void> {

    let storage = new Storage(<SqliteConnectionOptions>{
        name: 'test_express_app',
        type: 'sqlite',
        database: ':memory:'
    });

    await storage.init();
    Container.set(Storage,storage)

    let provider = new ProviderManager({
        schedule:{
            enable:false
        }
    })
    await provider.init()
    Container.set(ProviderManager,provider)

    useContainer(Container)
    let express = new Express({})
    await express.prepare()

};

boot();