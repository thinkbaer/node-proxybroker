import * as _ from 'lodash';
import {Config, FileUtils, ICommand, Log, PlatformUtils, System, TodoException, TYPEXS_NAME} from '@typexs/base';
import {ProxyData} from '../libs/proxy/ProxyData';
import {ITaskRunnerResult} from '@typexs/base/libs/tasks/ITaskRunnerResult';
import {TasksHelper} from '@typexs/base/libs/tasks/TasksHelper';
import {CFG_PROXY_STARTUP, CFG_PROXY_VALIDATOR, TN_PROXY_VALIDATE} from '../libs/Constants';
import {IProxyValidatiorOptions} from '../libs/proxy/IProxyValidatiorOptions';
import {OutputHelper} from '../libs/OutputHelper';


const REGEX = /^((http|https):\/\/)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):?(\d{1,5})?$/;

export class ProxyValidateCommand implements ICommand {


  command = 'proxy-validate <url_to_file>';
  aliases = 'prv';
  describe = 'Validate an <host> (format: "ip:port") or a <file> with a list of hosts separated by newline.';


  beforeStorage(): void {
    // Log.options({enable: false, transports: [{console:}], loggers: [{name: '*', enable: false}]}, false);
    Config.set(CFG_PROXY_STARTUP, true, TYPEXS_NAME);
    // Config.set('server', null, TYPEXS_NAME);
    System.enableDistribution(false);
    const cfg = Config.get(CFG_PROXY_VALIDATOR, null);
    if (!cfg) {
      Config.set(CFG_PROXY_VALIDATOR, <IProxyValidatiorOptions>{
        parallel: 100,
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
        describe: 'Select output format for results.',
        default: 'json'
      })
      .option('store', {
        alias: 's',
        describe: 'Enable storing.',
        default: false,
        type: 'boolean'
      });
  }

  async handler(argv: any) {
    let proxyData: ProxyData[] = [];

    if (PlatformUtils.fileExist(argv.url_to_file)) {
      const filename = argv.url_to_file;

      // todo check if json
      const fileExt = PlatformUtils.pathExtname(argv.url_to_file, false).toLowerCase();

      switch (fileExt) {
        case 'json':
          try {
            // tslint:disable-next-line:no-shadowed-variable
            const _proxyData = await FileUtils.getJson(filename);
            if (_.isArray(_proxyData)) {
              _proxyData.forEach(x => {
                if (_.has(x, 'ip') && _.has(x, 'port')) {
                  proxyData.push(x);
                }
              });
            } else {
              if (_.has(_proxyData, 'ip') && _.has(_proxyData, 'port')) {
                proxyData.push(_proxyData);
              }
            }
          } catch (e) {
            Log.error(e);
          }
          break;
        case 'csv':
          const buffer = await FileUtils.readFile(filename);
          const _proxyData = buffer.toString('utf-8').trim();
          _proxyData.split(/\n/).forEach((value, index, array) => {
            const matched = value.split(';').map(x => x.trim());
            if (matched.length > 0) {
              let entry = matched.shift();
              let schema: string = null;
              let ip: string = null;
              let port = 3128;
              if (/^https?$/.test(entry)) {
                schema = entry;
                entry = matched.shift();
              }

              if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(entry)) {
                ip = entry;
                entry = matched.shift();
              }

              if (/^\d+$/.test(entry)) {
                port = parseInt(entry, 0);
              }

              if (ip && port) {
                proxyData.push(new ProxyData(ip, port));
              }
            }
          });
          break;
        default:
          throw new TodoException('file ext not found');
      }


    } else {

      const matched = argv.url_to_file.match(REGEX);
      let schema = 'http';
      let ip = '127.0.0.1';
      let port = 3128;

      if (matched) {
        if (matched[1] && matched[2]) {
          // http or https exists
          schema = matched[2];
        }

        ip = matched[3];
        if (matched[4]) {
          // port
          port = parseInt(matched[4], 0);
        }
        proxyData.push(new ProxyData(ip, port));
      }
    }


    if (proxyData.length > 0) {
      let _proxyData: ProxyData[] = [];
      const results = <ITaskRunnerResult>await TasksHelper.exec(
        [
          {
            name: TN_PROXY_VALIDATE,
            incomings: {
              proxies: proxyData,
              store: argv.store
            }
          }
        ],
        {
          skipTargetCheck: false,
          isLocal: true,
          skipRequiredThrow: true,
        });

      if (results && results.results.length > 0) {
        for (const _result of results.results) {
          _proxyData = _proxyData.concat(_result.result);
        }
      }

      proxyData = _proxyData;

      OutputHelper.printResults(proxyData, argv.format);
    } else {
      console.log('no proxy data given');
    }


    return proxyData;

  }


}
