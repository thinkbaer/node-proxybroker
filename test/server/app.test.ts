import "reflect-metadata";
import {useContainer} from "routing-controllers";
import {Container} from "typedi";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Config} from "commons-config";
import {Invoker, Log, StorageRef} from "@typexs/base";

import {EventBus} from "commons-eventbus";
import {ProxyFilter} from "../../src/libs/proxy/ProxyFilter";
import {ProxyValidator} from "../../src/libs/proxy/ProxyValidator";
import {ProviderManager} from "../../src/libs/provider/ProviderManager";
import {TEST_STORAGE_OPTIONS} from "../functional/config";
import {TestHelper} from "../functional/TestHelper";

process.on('unhandledRejection', (reason: any, p: any) => {
  console.error(reason)
});

process.on('uncaughtException', (err: any) => {
  console.error(err, err.stack)

});

let storage: StorageRef;

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


  Log.enable = true;

  storage = await TestHelper.getDefaultStorageRef();

  let selector = new ProxyFilter(storage);
  await EventBus.register(selector);

  let validator = new ProxyValidator({
    schedule: {
      enable: true
    },
    judge: {
      selftest: true,
      remote_lookup: true,
      remote_ip: '127.0.0.1',
      ip: '0.0.0.0',
      http_port: 8080,
      request: {
        socket_timeout: 10000,
        connection_timeout: 5000
      }
    }
  }, storage);
  await EventBus.register(validator);
  await validator.prepare();
  Container.set(ProxyValidator, validator);

  let provider = new ProviderManager();
  await EventBus.register(provider);
  await provider.prepare(storage,{
    schedule: {
      enable: false
    }
  });


  Container.set(ProviderManager, provider);
  useContainer(Container)

  /*
  let express = new AppServer({
    _debug: true,
    routes: [
      {type: "static_files", path: __dirname + '/../../tmp/proxybroker-ui/dist'}
    ]
  });
  await express.prepare()
  console.log('start server')
  await express.start()
*/
};

boot();
