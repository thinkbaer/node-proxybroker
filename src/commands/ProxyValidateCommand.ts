import * as _ from 'lodash';
import {FileUtils, ICommand, Log, PlatformUtils, System, TodoException} from '@typexs/base';
import {ProxyData} from '../libs/proxy/ProxyData';
import {JudgeResults} from '../libs/judge/JudgeResults';
import {ITaskRunnerResult} from '@typexs/base/libs/tasks/ITaskRunnerResult';
import {TasksHelper} from '@typexs/base/libs/tasks/TasksHelper';
import {TN_PROXY_VALIDATE} from '../libs/Constants';


const REGEX = /^((http|https):\/\/)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):?(\d{1,5})?$/;

export class ProxyValidateCommand implements ICommand {

  static csvHeader = [
    'ip',
    'port',
    'country_code',
    'country_name',
    'region_code',
    'region_name',
    'city',
    'latitude',
    'longitude',
    'http_http.error',
    'http_http.error.code',
    'http_http.level',
    'http_http.duration',
    'http_http.log',
    'http_https.error',
    'http_https.error.code',
    'http_https.level',
    'http_https.duration',
    'http_https.log',
    'https_http.error',
    'https_http.error.code',
    'https_http.level',
    'https_http.duration',
    'https_http.log',
    'https_https.error',
    'https_https.error.code',
    'https_https.level',
    'https_https.duration',
    'https_https.log'

  ];

  command = 'proxy-validate <url_to_file>';
  aliases = 'prv';
  describe = 'Validate an <host> (format: "ip:port") or a <file> with a list of hosts separated by newline.';

  static resultToCsvRow(results: JudgeResults): any[] {
    const data = [
      results.ip,
      results.port,
      results.country_code,
      results.country_name,
      results.region_code,
      results.region_name,
      results.city,
      results.latitude,
      results.longitude
    ];

    for (const res of results.getVariants()) {
      data.push(
        res.hasError() ? '"' + (res.error.toString()).replace('"', '""') + '"' : '',
        res.hasError() ? '"' + (res.error.code).replace('"', '""') + '"' : '',
        res.level,
        res.duration,
        '"' + res.logToString().replace('"', '""') + '"',
      );
    }

    return data;
  }

  static emptyCsvRow(): any[] {
    return Array(ProxyValidateCommand.csvHeader.length).fill('');
  }

  beforeStartup() {
    // Config.set('server', null, TYPEXS_NAME);
    System.enableDistribution(false);
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
            const matched = value.trim().match(REGEX);
            if (matched) {
              let schema: string = null;
              let ip: string = null;
              let port = 3128;

              if (matched[1] && matched[2]) {
                // http or https exists
                schema = matched[2];
              }
              ip = matched[3];
              if (matched[4]) {
                // port
                port = parseInt(matched[4], 0);
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

      /*
                  if(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(argv.url_to_file)){
                      argv.url_to_file = 'http://'+argv.url_to_file
                  }

                  let _url = url.parse(argv.url_to_file)

                  if (!_url.port) {
                      _url.port = "3128"
                  }
      */

      // const judgeCustomOptions = Config.get('validator.judge', {});
      // const judge = new Judge(judgeCustomOptions);
      // const booted = await judge.prepare();
      //
      // if (booted) {
      //   try {
      //     const proxy = new ProxyData(ip, port);
      //     await judge.wakeup();
      //     proxy.results = await judge.validate(proxy.ip, proxy.port);
      //     await judge.pending();
      //     proxyData.push(proxy);
      //     // console.log(JSON.stringify(results, null, 2))
      //   } catch (err) {
      //     Log.error(err);
      //     await judge.pending();
      //   }
      // } else {
      //   throw new TodoException();
      // }
    }


    if (proxyData.length > 0) {


      // const validatorCustomOptions = Config.get('validator', {});
      // const validator = new ProxyValidator(validatorCustomOptions, null);
      // let booted = false;
      // try {
      //   booted = await validator.prepare();
      // } catch (err) {
      //   Log.error(err);
      //   throw err;
      // }
      //
      // if (booted) {
      //   try {
      //     let inc = 0;
      //     for (const _q of proxyData) {
      //       inc++;
      //       validator.push(_q);
      //     }
      //     Log.info('Added ' + inc + ' proxies to check');
      //     await validator.await();
      //   } catch (err) {
      //     Log.error(err);
      //   }
      //
      //   await validator.shutdown();

      // } else {
      //   throw new TodoException();

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
    }


    switch (argv.format) {
      case 'json':
        const data: JudgeResults[] = [];
        proxyData.forEach(_x => {
          if (_x.results) {
            const copy: ProxyData = _.clone(_x);
            for (const res of copy.results.getVariants()) {
              res.logStr = res.logToString();
              if (res.hasError()) {
                res.error = <any>{message: res.error.message, code: res.error.code};
              }
              delete res.log;
            }
            data.push(copy.results);
          }
        });
        console.log(JSON.stringify(data, null, 2));
        break;
      case 'csv':
        const rows: string[] = [ProxyValidateCommand.csvHeader.join(';')];
        proxyData.forEach(_x => {
          if (_x.results) {
            rows.push(ProxyValidateCommand.resultToCsvRow(_x.results).join(';'));
          } else {
            const emptyRow = ProxyValidateCommand.emptyCsvRow();
            emptyRow[0] = _x.ip;
            emptyRow[1] = _x.port;
            rows.push(emptyRow.join(';'));
          }
        });
        console.log(rows.join('\n'));
        break;

      default:
        break;
    }


    // } else {
    //   Log.error('NO DATA');
    //   return [];
    // }
    return proxyData;

    /*
    if(argv._resolve){

    }else{
        //process.exit(1)

    }*/


  }


}
