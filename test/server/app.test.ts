import "reflect-metadata";
import {useContainer} from "routing-controllers";
import {Container} from "typedi";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Storage} from "../../src/storage/Storage";
import {ProviderManager} from "../../src/provider/ProviderManager";
import {Express} from "../../src/server/Express";
import {Log} from "../../src/lib/logging/Log";
import {Config} from "commons-config";
import {ProxyDataSelector} from "../../src/proxy/ProxyDataSelector";
import {EventBus} from "../../src/events/EventBus";
import {ProxyValidationController} from "../../src/proxy/ProxyValidationController";

process.on('unhandledRejection', (reason: any, p: any) => {
    console.error(reason)
});

process.on('uncaughtException', (err: any) => {
    console.error(err, err.stack)

});


let boot = async function (): Promise<void> {

    Config.options({
        configs: [
            {type: 'system'},
            // find in same directory proxybroker
            {type: 'file', file: {dirname: './', filename: 'proxybroker'}},
            // find in proxyborker
            //{type: 'file', file: '${argv.configfile}'},
        ]
    });


    Log.enable = Log.console = true

    let storage = new Storage(<SqliteConnectionOptions>{
        name: 'test_express_app',
        type: 'sqlite',
        database: __dirname + '/tmp/sqlite.app.db'
    });
    await storage.init();
    Container.set(Storage, storage)

    let selector = new ProxyDataSelector(storage)
    EventBus.register(selector)

    let validator = new ProxyValidationController({
        selftest: true,
        remote_lookup: true,
        remote_url: 'http://127.0.0.1:8080',
        judge_url: 'http://0.0.0.0:8080',
        request: {
            socket_timeout: 10000,
            connection_timeout: 5000
        }
    },storage)
    EventBus.register(validator)
    await validator.prepare()
    Container.set(ProxyValidationController, validator)

    let provider = new ProviderManager({
        schedule: {
            enable: false
        }
    },storage)
    EventBus.register(provider)
    await provider.init()


    Container.set(ProviderManager, provider)
    useContainer(Container)

    let express = new Express({
        _debug: true,
        routes: [
            {type: "static_files", path: __dirname +'/../../tmp/proxybroker-ui/dist'}
        ]
    })
    await express.prepare()
    console.log('start server')
    await express.start()

};

boot();