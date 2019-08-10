import * as _ from 'lodash';
import {getMetadataArgsStorage} from 'typeorm';
import {Container, Invoker, PlatformUtils, StorageRef} from '@typexs/base';
import {TEST_PSQL_STORAGE_OPTIONS, TEST_STORAGE_OPTIONS} from './config';
import {IpAddr} from '../../src/entities/IpAddr';
import {IpLoc} from '../../src/entities/IpLoc';
import {IpAddrState} from '../../src/entities/IpAddrState';
import {IpRotateLog} from '../../src/entities/IpRotateLog';
import {IpRotate} from '../../src/entities/IpRotate';
// import {Job} from '../../src/entities/Job';
// import {JobState} from '../../src/entities/JobState';

let vid = 0;

export function createIp(_ip: string, port: number) {
  const ip = new IpAddr();
  ip.ip = _ip;
  ip.port = port;
  ip.validation_id = vid++;
  return ip;
}

export function createIpState(ip: IpAddr, src: number, dest: number, level: number, duration: number) {
  const ips_http = new IpAddrState();
  ips_http.validation_id = ip.validation_id;
  ips_http.protocol_src = src;
  ips_http.protocol_dest = dest;
  ips_http.addr_id = ip.id;
  ips_http.level = level;
  ips_http.enabled = true;
  ips_http.duration = duration;
  return ips_http;
}

export class TestHelper {

  static wait(ms: number) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  static logEnable(set?: boolean) {
    return process.env.CI_RUN ? false : _.isBoolean(set) ? set : true;
  }


  static sslPath(dir: string) {
    return PlatformUtils.join(__dirname, '_files/ssl', dir);
  }


  static async getDefaultStorageRef() {
    const invoker = new Invoker();
    Container.set(Invoker.NAME, invoker);
    const opts = _.clone(TEST_STORAGE_OPTIONS);
    (<any>opts).entities = [
      IpAddr, IpLoc, IpAddrState, IpRotateLog, IpRotate // , Job, JobState
    ];
    const storage = new StorageRef(opts);
    await storage.prepare();
    return storage;
  }

  static async getPostgresStorageRef() {
    const invoker = new Invoker();
    Container.set(Invoker.NAME, invoker);
    const opts = _.clone(TEST_PSQL_STORAGE_OPTIONS);
    (<any>opts).entities = [
      IpAddr, IpLoc, IpAddrState, IpRotateLog, IpRotate // , Job, JobState
    ];
    const storage = new StorageRef(opts);
    await storage.prepare();
    return storage;
  }

  static typeOrmRestore() {
    require('../../src/entities/SystemNodeInfo');
    require('../../src/entities/TaskLog');
  }

  static typeOrmReset() {
//    PlatformTools.getGlobalVariable().typeormMetadataArgsStorage = null;

    const e: string[] = ['SystemNodeInfo', 'TaskLog'];
    _.keys(getMetadataArgsStorage()).forEach(x => {
      _.remove(getMetadataArgsStorage()[x], y => y['target'] && e.indexOf(y['target'].name) === -1);
    });
  }

  static waitFor(fn: Function, ms: number = 50, rep: number = 30) {
    return new Promise((resolve, reject) => {
      const c = 0;
      const i = setInterval(() => {
        if (c >= rep) {
          clearInterval(i);
          reject(new Error('max repeats reached ' + rep));
        }
        try {
          const r = fn();
          if (r) {
            clearInterval(i);
            resolve();
          }
        } catch (err) {
          clearInterval(i);
          reject(err);
        }
      }, ms);
    });
  }
}
