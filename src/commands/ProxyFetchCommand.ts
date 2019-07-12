import * as _ from 'lodash';
import {IProxyData} from '../libs/proxy/IProxyData';
import {ProviderManager} from '../libs/provider/ProviderManager';
import {C_STORAGE_DEFAULT, Config, ICommand, Inject, Log, StorageRef, TodoException, TYPEXS_NAME} from '@typexs/base';
import {IProviderOptions} from '../libs/provider/IProviderOptions';
import {C_SERVER} from '@typexs/server';
import {IProviderVariant} from '../libs/provider/IProviderVariant';


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
    let p: IProxyData[] = null;
    let variants: IProviderVariant[] = [];

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

    variants = this.providerManager.findAll(find);


    if (_.isEmpty(provider) && _.isEmpty(variant)) {
      if (_.isEmpty(variants)) {
        console.log('No proxy fetcher found.');
      } else {
        console.log('Proxy provider variants:');
        variants.forEach(_x => {
          console.log('\t- name: ' + _x.name + ';  variant: ' + _x.type + ' on ' + _x.url);
        });
      }
      variants = [];
    } else if (!_.isEmpty(provider) && _.isEmpty(variant)) {
      console.log('No variant ' + variant + ' for provider ' + provider + ' found.');
      console.log('ProxieseCurrent variant list for ' + provider + ':');

    }


    // await this.providerManager.queue.pause();

    if (variants.length > 0) {

      let list: IProxyData[] = [];

      for (const v of variants) {
        console.log('Variant name: ' + v.name + ';  variant: ' + v.type + ' on ' + v.url);
        const def = this.providerManager.get(v);
        const worker = await this.providerManager.createWorker(def.variant);
        p = await worker.fetch();
        list = _.concat(list, p);
      }

      switch (argv.format) {
        case 'json':
          console.log(JSON.stringify(p, null, 2));
          break;
        case 'csv':
          let rows: string[] = [];
          p.forEach(_rowData => {
            rows.push([_rowData.ip, _rowData.port].join(':'));
          });
          rows = _.uniq(rows);
          console.log(rows.join('\n'));
          break;
        default:
          throw new TodoException();

      }
    } else {
      console.log('No data selected.');
    }


  }
}
