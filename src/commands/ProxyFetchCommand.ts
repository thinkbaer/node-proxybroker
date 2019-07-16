import * as _ from 'lodash';
import {IProxyData} from '../libs/proxy/IProxyData';
import {ProviderManager} from '../libs/provider/ProviderManager';
import {C_STORAGE_DEFAULT, Config, ICommand, Inject, Log, StorageRef, TodoException, TYPEXS_NAME} from '@typexs/base';
import {IProviderOptions} from '../libs/provider/IProviderOptions';
import {C_SERVER} from '@typexs/server';
import {TasksHelper} from '@typexs/base/libs/tasks/TasksHelper';
import {TN_PROXY_FETCH} from '../libs/Constants';
import {ITaskRunnerResult} from '@typexs/base/libs/tasks/ITaskRunnerResult';


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
    Log.enable = false;
    Config.set('logging.enable', false, TYPEXS_NAME);
    Config.set(C_SERVER, null, TYPEXS_NAME);
    Config.set('proxybroker.startup', true, TYPEXS_NAME);
    Config.set('proxybroker.provider', <IProviderOptions>{}, TYPEXS_NAME);
  }


  builder(yargs: any) {
    return yargs
      .option('format', {
        alias: 'f',
        describe: 'Set outputformat (default: json).',
        'default': 'json',
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

    const variants = this.providerManager.findAll(find);
    if (_.isEmpty(provider) && _.isEmpty(variant)) {
      if (_.isEmpty(variants)) {
        console.error('No proxy fetcher found.');
      } else {
        console.error('Proxy provider variants:');
        variants.forEach(_x => {
          console.error('\t- name: ' + _x.name + ';  variant: ' + _x.type + ' on ' + _x.url);
        });
      }
    } else if (!_.isEmpty(provider) && _.isEmpty(variant)) {
      console.error('No variant ' + variant + ' for provider ' + provider + ' found.');
      console.error('Proxy current variant list for ' + provider + ':');

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

      const results = <ITaskRunnerResult>await TasksHelper.exec(tasks, {
        skipTargetCheck: false,
        isLocal: true,
        provider: 'placeholder'
      });

      if (results && results.results.length > 0) {
        for (const _result of results.results) {
          list = list.concat(_result.outgoing.proxies);
        }

        list = _.uniqBy(list, x => JSON.stringify(x));
      }

      switch (argv.format) {
        case 'json':
          console.log(JSON.stringify(list, null, 2));
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
