import * as _ from 'lodash';
import {IProxyData} from '../libs/proxy/IProxyData';
import {ProviderManager} from '../libs/provider/ProviderManager';
import {C_STORAGE_DEFAULT, Config, ICommand, Inject, Log, StorageRef, System, TaskState, TodoException, TYPEXS_NAME} from '@typexs/base';
import {IProviderOptions} from '../libs/provider/IProviderOptions';
import {C_SERVER} from '@typexs/server';
import {TasksHelper} from '@typexs/base/libs/tasks/TasksHelper';
import {
  CFG_PROXY_PROVIDERS_CONFIG_ROOT,
  CFG_PROXY_STARTUP,
  CFG_PROXY_VALIDATOR,
  TN_PROXY_FETCH,
  TN_PROXY_VALIDATE
} from '../libs/Constants';
import {ITaskRunnerResult} from '@typexs/base/libs/tasks/ITaskRunnerResult';
import {IProxyValidatiorOptions} from '../libs/proxy/IProxyValidatiorOptions';
import {JudgeResults} from '../libs/judge/JudgeResults';
import {ProxyData} from '../libs/proxy/ProxyData';
import {OutputHelper} from '../libs/OutputHelper';


export class ProxyFetchCommand implements ICommand {

  command = 'proxy-fetch [provider] [variant]';

  aliases = 'prf';

  describe = 'Retrieve proxies from a <provider> and optional [variant].';

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  @Inject(ProviderManager.NAME)
  providerManager: ProviderManager;


  beforeStorage(): void {
    // reset settings
    // Log.options({enable: false, transports: [], loggers: [{name: '*', enable: false}]}, false);
    System.enableDistribution(false);
    Config.set(C_SERVER, null, TYPEXS_NAME);
    Config.set(CFG_PROXY_STARTUP, true, TYPEXS_NAME);
    Config.set(CFG_PROXY_PROVIDERS_CONFIG_ROOT, <IProviderOptions>{}, TYPEXS_NAME);

    const cfg = Config.get(CFG_PROXY_VALIDATOR, null);
    if (!cfg) {
      Config.set(CFG_PROXY_VALIDATOR, <IProxyValidatiorOptions>{
        parallel: 50,
        judge: {
          selftest: true,
          remote_lookup: true,
          remote_ip: '127.0.0.1',
          ip: '0.0.0.0',
          request: {
            timeout: 5000
          }
        }
      }, TYPEXS_NAME);
    }

  }


  builder(yargs: any) {
    return yargs
      .option('format', {
        alias: 'f',
        describe: 'Set outputformat (default: json).',
        'default': 'json',
        demand: true
      })
      .option('validate', {
        alias: 'vd',
        describe: 'Enable validate',
        default: false,
        type: 'boolean',
        demand: true
      })
      .option('store', {
        alias: 's',
        describe: 'Enable storing',
        default: false,
        type: 'boolean',
        demand: true
      });
  }


  async handler(argv: any) {

    let provider = null;
    let variant = null;

    const find: any = {};
    if (argv.provider) {
      provider = argv.provider;
      if (argv.provider !== '*') {
        find.name = argv.provider;
      }

      if (argv.variant) {
        variant = argv.variant;
        find.type = argv.variant;
      }

    }

    let variants = this.providerManager.findAll(find);
    if (_.isEmpty(provider) && _.isEmpty(variant)) {
      if (_.isEmpty(variants)) {
        console.error('No proxy fetcher found.');
      } else {
        console.error('Proxy provider variants:');
        variants.forEach(_x => {
          console.error('\t- name: ' + _x.name + ';  variant: ' + _x.type + ' on ' + _x.url);
        });
      }
      variants = [];
    } else if (!_.isEmpty(provider) && _.isEmpty(variant)) {
      console.error('No variant ' + variant + ' for provider ' + provider + ' found.');
      console.error('Proxy current variant list for ' + provider + ':');
      variants.forEach(_x => {
        console.error('\t- name: ' + _x.name + ';  variant: ' + _x.type + ' on ' + _x.url);
      });
      console.error('\nExecute:\n');
    }


    let list: IProxyData[] = [];
    if (variants.length > 0) {
      // await this.providerManager.queue.pause();

      const providerNames = _.uniq(variants.map(x => x.name));
      const tasks = [];

      for (const providerName of providerNames) {
        const variantNames = variants.filter(x => x.name === providerName).map(x => x.type);
        tasks.push({name: TN_PROXY_FETCH, incomings: {provider: providerName, variants: variantNames}});
      }

      const params: any = {
        skipTargetCheck: false,
        isLocal: true,
        provider: 'placeholder'
      };
      if (argv.validate) {
        params.validate = true;
      } else {
        params.validate = false;
      }

      if (argv.store) {
        params.store = true;
      } else {
        params.store = false;
      }

      const results = <ITaskRunnerResult>await TasksHelper.exec(tasks, params);
      if (results && results.results.length > 0) {
        const r = <TaskState[]>_.filter(results.results, x => x.name === (params.validate ? TN_PROXY_VALIDATE : TN_PROXY_FETCH));
        for (const _result of r) {
          list = list.concat(_result.result);
        }
        list = _.uniqBy(list, x => JSON.stringify(x));
      }

      switch (argv.format) {
        case 'json':
          const  data = OutputHelper.toJson(list);
          // list.forEach((_x: any) => {
          //   if (_x.results) {
          //     const copy: ProxyData = _.clone(_x);
          //     for (const res of copy.results.variants) {
          //       res.logStr = res.logToString();
          //       if (res.hasError()) {
          //         res.error = <any>{message: res.error.message, code: res.error.code};
          //       }
          //       delete res.log;
          //     }
          //     data.push(copy.results);
          //   } else {
          //     data.push(_x);
          //   }
          // });
          console.log(JSON.stringify(data, null, 2));
          break;
        case 'csv':
          let rows: string[] = [];
          list.forEach(_rowData => {
            rows.push([_rowData.ip, _rowData.port].join(':'));
          });
          rows = _.uniq(rows);
          console.log(rows.join('\n'));
          break;
        default:
          throw new TodoException();
      }
    } else {
      console.error('No data selected.');
    }
    return list;


  }
}
