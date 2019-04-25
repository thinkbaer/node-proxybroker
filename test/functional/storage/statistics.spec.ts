import * as fs from 'fs';

import {suite, test} from "mocha-typescript";

import {Invoker, Log, StorageRef, Container} from "@typexs/base";
import {TEST_STORAGE_OPTIONS} from "../config";
import {Statistics} from "../../../src/libs/specific/storage/Statistics";
import * as _ from "lodash";
import {IpAddr} from "../../../src/entities/IpAddr";
import {IpLoc} from "../../../src/entities/IpLoc";


let storage: StorageRef = null;

@suite('storage/Statistics')
class EntitiesTest {

  static async before() {
    Log.options({enable: false});
    let invoker = new Invoker();
    Container.set(Invoker.NAME, invoker);

    let opts = _.clone(TEST_STORAGE_OPTIONS);
    (<any>opts).entities = [
      IpAddr, IpLoc
    ];
    storage = new StorageRef(opts);
    await storage.prepare();
  }

  static async after() {
    await storage.shutdown();
  }

  @test.skip()
  async 'build'() {
    let s = new Statistics(storage);

    await s.stats();


  }

}

