// process.env.SQL_LOG = '1';

import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import {Log, StorageRef} from '@typexs/base';
import {createIp, createIpState, TestHelper} from '../TestHelper';
import {ProtocolType} from '../../../src/libs/specific/ProtocolType';
import {ProxyRotator} from '../../../src/libs/proxy/ProxyRotator';
import {ProxyUsed} from '../../../src/libs/proxy/ProxyUsed';

let storage: StorageRef = null;


@suite('proxy/ProxyRotator')
class ProxyRotatorTest {


  async before() {
    Log.options({enable: false, level: 'debug', loggers: [{name: '*', level: 'debug', enable: true}]});
    storage = await TestHelper.getDefaultStorageRef();

    const c = await storage.connect();

    let ip = createIp('127.0.0.1', 3128);
    ip = await c.save(ip);

    let ips_http = createIpState(ip, ProtocolType.HTTP, ProtocolType.HTTP, 1, 100);
    ips_http = await c.save(ips_http);

    let ips_https = createIpState(ip, ProtocolType.HTTP, ProtocolType.HTTPS, 1, 5000);
    ips_https.enabled = false;
    ips_https = await c.save(ips_https);


    ip = createIp('127.0.0.2', 3128);
    ip = await c.save(ip);

    ips_http = createIpState(ip, ProtocolType.HTTP, ProtocolType.HTTP, 1, 200);
    ips_http = await c.save(ips_http);

    ip = createIp('127.0.0.3', 3128);
    ip = await c.save(ip);

    ips_http = createIpState(ip, ProtocolType.HTTP, ProtocolType.HTTP, 1, 400);
    ips_http = await c.save(ips_http);

    await c.close();
  }


  async after() {
    await storage.shutdown();
  }


  @test
  async 'log success'() {

    const e = new ProxyUsed();
    e.statusCode = 201;
    e.duration = 1000;
    e.success = true;
    e.protocol = ProtocolType.HTTP;
    e.protocol_dest = ProtocolType.HTTP;
    e.start = new Date();
    e.stop = new Date();
    e.ip = '127.0.0.1';
    e.port = 3128;

    const rotator = new ProxyRotator();
    rotator.storageRef = storage;
    rotator.doRequest = async () => {
    };
    await rotator.prepare({});

    const rotate = await rotator.log(e);


    expect(rotate).to.deep.include({
      successes: 1,
      errors: 0,
      duration: 1000,
      duration_average: 1000,
      inc: 1,
      used: 1,
      addr_id: 1,
      protocol_src: 1,
      id: 1,
    });

    expect(rotate['_log']).to.deep.include({
      duration: 1000,
      addr_id: 1,
      protocol: 1,
      error: null,
      statusCode: 201,
      id: 1, success: true,
    });

    // console.log(rotate)
  }

  @test
  async 'log error'() {
    const e = new ProxyUsed();
    e.statusCode = 504;
    e.duration = 1000;
    e.success = false;
    e.protocol = ProtocolType.HTTP;
    e.protocol_dest = ProtocolType.HTTP;
    e.start = new Date();
    e.stop = new Date();
    e.ip = '127.0.0.1';
    e.port = 3128;
    e.error = new Error('Test');

    const rotator = new ProxyRotator();
    rotator.doRequest = async () => {
    };
    rotator.storageRef = storage;
    await rotator.prepare({});

    const rotate = await rotator.log(e);


    expect(rotate).to.deep.include({
      successes: 0,
      errors: 1,
      duration: 0,
      duration_average: 0,
      inc: 1,
      used: 1,
      protocol_src: 1,
    });

    expect(rotate['_log']).to.deep.include({
      duration: 1000,
      protocol: 1,
      statusCode: 504,
      success: false,
    });


  }

  @test
  async 'rotate'() {

    const rotator = new ProxyRotator();

    rotator.doRequest = async () => {
    };
    rotator.storageRef = storage;
    await rotator.prepare({});

    const next_addr = await rotator.next();
    expect(next_addr).to.not.be.empty;

    expect(next_addr).to.deep.include({
      id: 1,
      key: '127.0.0.1:3128',
      ip: '127.0.0.1',
      protocols_src: 0,
      protocols_dest: 0,
      blocked: false,
      to_delete: false,
      count_errors: 0,
      errors_since_at: null,
      count_success: 0,
      success_since_at: null
    });
  }

  @test
  async 'rotate failed'() {
    const rotator = new ProxyRotator();
    rotator.storageRef = storage;
    await rotator.prepare({});

    let error: Error = null;
    try {
      await rotator.next();
    } catch (e) {
      error = e;
    }
    expect(error).to.not.be.null;
    expect(error.message).to.be.eq('cant find proxy address!');
    // expect(error.message).to.be.eq();
  }

  @test
  async 'rotate used'() {

    const rotator = new ProxyRotator();
    rotator.doRequest = async () => {
    };
    rotator.storageRef = storage;
    await rotator.prepare({debug: {activeList: true}, reuse: 3});

    let next_addr = await rotator.next();
    expect(next_addr).to.be.deep.include({ip: '127.0.0.1', port: 3128});

    await rotator.queue.await();

    next_addr = await rotator.next();
    expect(next_addr).to.be.deep.include({ip: '127.0.0.2', port: 3128});

    next_addr = await rotator.next();
    expect(next_addr).to.be.deep.include({ip: '127.0.0.3', port: 3128});

    next_addr = await rotator.next();
    expect(next_addr).to.be.deep.include({ip: '127.0.0.1', port: 3128});


    next_addr = await rotator.next();
    expect(next_addr).to.be.deep.include({ip: '127.0.0.2', port: 3128});

    next_addr = await rotator.next();
    expect(next_addr).to.be.deep.include({ip: '127.0.0.3', port: 3128});

  }


}


