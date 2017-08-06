import "reflect-metadata";
import {useContainer} from "routing-controllers";
import {Container} from "typedi";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Storage} from "../../src/storage/Storage";
import {ProviderManager} from "../../src/provider/ProviderManager";
import {AppServer} from "../../src/server/AppServer";
import {Log} from "../../src/lib/logging/Log";
import {Config} from "commons-config";
import {ProxyFilter} from "../../src/proxy/ProxyFilter";
import {EventBus} from "../../src/events/EventBus";
import {ProxyValidator} from "../../src/proxy/ProxyValidator";

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
    await storage.prepare();
    Container.set(Storage, storage)

    let selector = new ProxyFilter(storage)
    EventBus.register(selector)

    let validator = new ProxyValidator({
        schedule: {
            enable: true
        },
        judge: {
            selftest: true,
            remote_lookup: true,
            remote_ip:'127.0.0.1',
            ip:'0.0.0.0',
            http_port:8080,
            request: {
                socket_timeout: 10000,
                connection_timeout: 5000
            }
        }
    }, storage)
    EventBus.register(validator)
    await validator.prepare()
    Container.set(ProxyValidator, validator)

    let provider = new ProviderManager({
        schedule: {
            enable: false
        }
    }, storage)
    EventBus.register(provider)
    await provider.prepare()


    Container.set(ProviderManager, provider)
    useContainer(Container)

    let express = new AppServer({
        _debug: true,
        routes: [
            {type: "static_files", path: __dirname + '/../../tmp/proxybroker-ui/dist'}
        ]
    })
    await express.prepare()
    console.log('start server')
    await express.start()

};

boot();