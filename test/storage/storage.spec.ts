import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {Container, Invoker, StorageRef} from "@typexs/base";

import {IpAddr} from "../../src/entities/IpAddr";
import {TEST_STORAGE_OPTIONS} from "../config";


@suite('storage/Storage')
class StorageTest {

  @test
  async 'init'() {
    let invoker = new Invoker();
    Container.set(Invoker.NAME, invoker);

    let storage = new StorageRef(TEST_STORAGE_OPTIONS);
    await storage.prepare();

    let entityNames: Array<string> = [];
    let cw = await storage.connect();
    cw.connection.entityMetadatas.forEach(entityMeta => {
      entityNames.push(entityMeta.targetName)
    });
    entityNames = entityNames.sort();
    expect(entityNames).to.be.deep.eq([
      "IpAddrState", "IpAddr", "Variable", "IpLoc", "Job", "JobState", "IpRotate", "IpRotateLog"
    ].sort());

    expect(storage.size()).to.be.eq(1);
    await storage.shutdown();
    expect(storage.size()).to.be.eq(0)
  }

  /**
   * sqlite in-memory test
   *
   * @returns {Promise<void>}
   */
  @test
  async 'static'() {
    let invoker = new Invoker();
    Container.set(Invoker.NAME, invoker);

    let storage = new StorageRef(TEST_STORAGE_OPTIONS);
    await storage.prepare();
    expect(storage.size()).to.be.eq(1);

    await storage.shutdown()
  }

}
