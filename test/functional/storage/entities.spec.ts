import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';

import {Container, Invoker, StorageRef} from '@typexs/base';
import {TEST_STORAGE_OPTIONS} from '../config';
import {IpLoc} from '../../../src/entities/IpLoc';
import {IpRotate} from '../../../src/entities/IpRotate';
import {IpRotateLog} from '../../../src/entities/IpRotateLog';
import {IpAddrState} from '../../../src/entities/IpAddrState';
import {IpAddr} from '../../../src/entities/IpAddr';
import {ProtocolType} from '../../../src/libs/specific/ProtocolType';
import * as _ from 'lodash';

let storage: StorageRef = null;

@suite('storage/entity/' + __filename)
class EntitiesTest {

  static async before() {
    const invoker = new Invoker();
    Container.set(Invoker.NAME, invoker);
    const opts = _.clone(TEST_STORAGE_OPTIONS);
    (<any>opts).entities = [
      IpAddr
    ];
    storage = new StorageRef(opts);
    await storage.prepare();
  }

  static async after() {
    if (storage) {
      await storage.shutdown();
    }


  }

  @test.skip()
  'TODO: entity: IpLoc'() {
    const e = new IpLoc();
  }

  @test.skip()
  'TODO: entity: IpRotate'() {
    const e = new IpRotate();
  }

  @test.skip()
  'TODO: entity: IpRotateLog'() {
    const e = new IpRotateLog();
  }

  @test.skip()
  async 'TODO: entity: IpAddrStatus'() {
    const e = new IpAddrState();
  }

  @test
  async 'entity: IpAddr'() {
    let e = new IpAddr();
    e.ip = '127.0.0.1';
    e.port = 12345;

    expect(e.blocked).to.be.false;
    expect(e.to_delete).to.be.false;

    let c = await storage.connect();
    let ne = await c.save(e);

    await c.close();
    expect(ne).to.deep.eq(e);

    c = await storage.connect();
    ne = await c.manager.findOne(IpAddr, ne.id);
    await c.close();
    // e.flattenDates();
    expect(ne).to.deep.eq(e);

    e = new IpAddr();
    e.ip = '127.0.0.2';
    e.port = 12345;

    expect(e.supportsHttp()).to.be.false;
    expect(e.supportsHttps()).to.be.false;
    expect(e.supportsBoth()).to.be.false;

    e.addProtocol(ProtocolType.HTTP);
    expect(e.supportsHttp()).to.be.true;
    expect(e.supportsHttps()).to.be.false;
    expect(e.supportsBoth()).to.be.false;

    e.addProtocol(ProtocolType.HTTPS);
    expect(e.supportsHttp()).to.be.true;
    expect(e.supportsHttps()).to.be.true;
    expect(e.supportsBoth()).to.be.true;

    e.removeProtocol(ProtocolType.HTTP);
    expect(e.supportsHttp()).to.be.false;
    expect(e.supportsHttps()).to.be.true;
    expect(e.supportsBoth()).to.be.false;

    e.removeProtocol(ProtocolType.HTTPS);
    expect(e.supportsHttp()).to.be.false;
    expect(e.supportsHttps()).to.be.false;
    expect(e.supportsBoth()).to.be.false;
  }

  /*
    @test
    async 'entity: Variable'() {
      let e = new Variable();
      e.key = 'test';
      e.value = 'data';

      let c = await storage.connect();
      let ne = await c.save(e);
      await c.close();
      expect(ne).to.deep.eq(e);

      c = await storage.connect();
      ne = await c.connection.manager.findOneById(Variable, 'test');
      await c.close();
      expect(ne).to.deep.eq(e)
    }

   */
}

