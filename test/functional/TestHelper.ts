import * as _ from 'lodash';
import {getMetadataArgsStorage} from "typeorm";
import {Invoker,Container, PlatformUtils, StorageRef} from '@typexs/base';
import {TEST_STORAGE_OPTIONS} from "./config";
import {IpAddr} from "../../src/entities/IpAddr";
import {IpLoc} from "../../src/entities/IpLoc";
import {IpAddrState} from "../../src/entities/IpAddrState";
import {IpRotateLog} from "../../src/entities/IpRotateLog";
import {IpRotate} from "../../src/entities/IpRotate";
import {Job} from "../../src/entities/Job";
import {JobState} from "../../src/entities/JobState";


export class TestHelper {

  static wait(ms: number) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    })
  }

  static logEnable(set?: boolean) {
    return process.env.CI_RUN ? false : _.isBoolean(set) ? set : true;
  }


  static sslPath(dir: string) {
    return PlatformUtils.join(__dirname, '_files/ssl', dir)
  }


  static async getDefaultStorageRef(){
    let invoker = new Invoker();
    Container.set(Invoker.NAME, invoker);
    let opts = _.clone(TEST_STORAGE_OPTIONS);
    (<any>opts).entities = [
      IpAddr, IpLoc, IpAddrState, IpRotateLog, IpRotate, Job, JobState
    ];
    let storage = new StorageRef(opts);
    await storage.prepare();
    return  storage;
  }

  static typeOrmRestore() {
    require('../../src/entities/SystemNodeInfo');
    require('../../src/entities/TaskLog');
  }

  static typeOrmReset() {
//    PlatformTools.getGlobalVariable().typeormMetadataArgsStorage = null;

    const e: string[] = ['SystemNodeInfo', 'TaskLog'];
    _.keys(getMetadataArgsStorage()).forEach(x => {
      _.remove(getMetadataArgsStorage()[x], y => y['target'] && e.indexOf(y['target'].name) == -1)
    })
  }

  static waitFor(fn: Function, ms: number = 50, rep: number = 30) {
    return new Promise((resolve, reject) => {
      let c = 0;
      let i = setInterval(() => {
        if (c >= rep) {
          clearInterval(i);
          reject(new Error('max repeats reached ' + rep))
        }
        try {
          let r = fn();
          if (r) {
            clearInterval(i);
            resolve()
          }
        } catch (err) {
          clearInterval(i);
          reject(err)
        }
      }, ms)
    })
  }
}
