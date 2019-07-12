import {ICommand, Log, PlatformUtils, System, TodoException, TYPEXS_NAME} from '@typexs/base';
import {Config} from 'commons-config';
import * as fs from 'fs';
import {ProxyData} from '../libs/proxy/ProxyData';
import {ProxyValidator} from '../libs/proxy/ProxyValidator';
import {JudgeResults} from '../libs/judge/JudgeResults';
import {Judge} from '../libs/judge/Judge';


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

  command = 'proxy-validate <host_or_file>';
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
      });
  }

  async handler(argv: any) {
    const list: ProxyData[] = [];

    if (PlatformUtils.fileExist(argv.host_or_file)) {


      const filename = argv.host_or_file;
      const buffer = fs.readFileSync(filename);
      const data = buffer.toString('utf-8').trim();


      data.split(/\n/).forEach((value, index, array) => {
//                let d = value.trim().split(/:|;/);
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
            list.push(new ProxyData(ip, port));
          }

        }

      });


      if (list.length) {
        const validatorCustomOptions = Config.get('validator', {});
        const validator = new ProxyValidator(validatorCustomOptions, null);
        let booted = false;
        try {
          booted = await validator.prepare();
        } catch (err) {
          Log.error(err);
          throw err;
        }

        if (booted) {
          try {
            let inc = 0;
            for (const _q of list) {
              inc++;
              validator.push(_q);
            }
            Log.info('Added ' + inc + ' proxies to check');
            await validator.await();
          } catch (err) {
            Log.error(err);
          }

          await validator.shutdown();

        } else {
          throw new TodoException();
        }


      } else {
        Log.error('NO DATA');
      }


    } else {

      const matched = argv.host_or_file.match(REGEX);
      let schema = 'http';
      let ip = '127.0.0.1';
      let port = 3128;

      if (matched) {
        if (matched[1] && matched[2]) {
          // http or https exists
          schema = matched[2];
        } else {

        }

        ip = matched[3];

        if (matched[4]) {
          // port
          port = parseInt(matched[4], 0);
        } else {

        }
      } else {
        return process.exit(1);
      }

      /*
                  if(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(argv.host_or_file)){
                      argv.host_or_file = 'http://'+argv.host_or_file
                  }

                  let _url = url.parse(argv.host_or_file)

                  if (!_url.port) {
                      _url.port = "3128"
                  }
      */

      const judgeCustomOptions = Config.get('validator.judge', {});
      const judge = new Judge(judgeCustomOptions);
      const booted = await judge.prepare();

      if (booted) {
        try {
          const proxy = new ProxyData(ip, port);
          await judge.wakeup();
          proxy.results = await judge.validate(proxy.ip, proxy.port);
          await judge.pending();
          list.push(proxy);
          // console.log(JSON.stringify(results, null, 2))
        } catch (err) {
          Log.error(err);
          await judge.pending();
        }
      } else {
        throw new TodoException();
      }
    }


    switch (argv.format) {
      case 'json':
        const data: JudgeResults[] = [];
        list.forEach(_x => {
          if (_x.results) {
            for (const res of _x.results.getVariants()) {
              res.logStr = res.logToString();
              delete res.log;
            }
            data.push(_x.results);
          }
        });
        console.log(JSON.stringify(data, null, 2));
        break;
      case 'csv':
        const rows: string[] = [ProxyValidateCommand.csvHeader.join(';')];
        list.forEach(_x => {
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

    if (argv._resolve) {
      return Promise.resolve(list);
    } else {
      return process.exit();
    }

    /*
    if(argv._resolve){

    }else{
        //process.exit(1)

    }*/


  }


}
