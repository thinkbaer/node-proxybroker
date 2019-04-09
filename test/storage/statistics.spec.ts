import * as fs from 'fs';

import {suite, test} from "mocha-typescript";
import {Statistics} from "../../src/libs/specific/storage/Statistics";
import {Invoker, Log, StorageRef, Container} from "@typexs/base";
import {TEST_STORAGE_OPTIONS} from "../config";


let storage: StorageRef = null;
let dbFile = __dirname + '/../_files/test_database.db';

@suite('storage/Statistics')
class EntitiesTest {

  static async before() {
    Log.options({enable: false});
    let invoker = new Invoker();
    Container.set(Invoker.NAME, invoker);
    storage = new StorageRef(TEST_STORAGE_OPTIONS);
    await storage.prepare();
  }

  static async after() {
    fs.unlinkSync(dbFile)
    await storage.shutdown();
  }

  @test.skip()
  async 'build'() {
    let s = new Statistics(storage);

    await s.stats();


  }

}

