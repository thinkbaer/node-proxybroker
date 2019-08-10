import {expect} from 'chai';
import {suite, test, timeout} from 'mocha-typescript';
import {Log, StorageRef} from '@typexs/base';
import {ProxyServer} from '../../../src/libs/server/ProxyServer';
import {ProxyRotator} from '../../../src/libs/proxy/ProxyRotator';
import {createIp, createIpState, TestHelper} from '../TestHelper';
import {ProtocolType} from '../../../src/libs/specific/ProtocolType';
import {IProxyServerOptions} from '../../../src/libs/server/IProxyServerOptions';
import {HttpFactory, IHttp, IHttpGetOptions} from 'commons-http';
import {IpRotate} from '../../../src/entities/IpRotate';
import {IpRotateLog} from '../../../src/entities/IpRotateLog';
import {IpAddr} from '../../../src/entities/IpAddr';
import {IpAddrState} from '../../../src/entities/IpAddrState';
import {IpLoc} from '../../../src/entities/IpLoc';


let storage: StorageRef = null;
let server_dest: ProxyServer = null;
let server_distrib: ProxyServer = null;
const opts: IHttpGetOptions = {
  retry: 0,
  proxy: 'http://127.0.0.1:3180',
  headers: {
    'Proxy-Select-Level': 1
  }
};

opts['proxyHeaderExclusiveList'] = [
  'proxy-select-level',
  'proxy-select-speed-limit',
  'proxy-select-ssl',
  'proxy-select-country',
  'proxy-select-fallback'
];

const http_url = 'http://example.com';
// let http_string = 'A good place to start is by skimming';
const https_url = 'https://example.com';
// let https_string = 'As an asynchronous event driven JavaScript runtime';


let rotator: ProxyRotator = null;
let http: IHttp = null;

@suite('functional/server/' + __filename.replace(__dirname + '/', '')) @timeout(20000)
class ProxyServerTest {


  static async before() {
    http = HttpFactory.create();

    Log.options({enable: false, level: 'debug', loggers: [{name: '*', level: 'debug', enable: true}]});

    storage = await TestHelper.getPostgresStorageRef();

    const c = await storage.connect();

    await c.manager.delete(IpAddr, {});
    await c.manager.delete(IpAddrState, {});
    await c.manager.delete(IpRotate, {});
    await c.manager.delete(IpRotateLog, {});
    await c.manager.delete(IpLoc, {});

    let ip = createIp('127.0.0.1', 3128);
    try {
      ip = await c.save(ip);
    } catch (e) {

    }


    let ips_http = createIpState(ip, ProtocolType.HTTP, ProtocolType.HTTP, 1, 100);
    try {
      ips_http = await c.save(ips_http);
    } catch (e) {
    }


    let ips_https = createIpState(ip, ProtocolType.HTTP, ProtocolType.HTTPS, 1, 500);
    // ips_https.enabled = false;
    try {
      ips_https = await c.save(ips_https);
    } catch (e) {
    }

    rotator = new ProxyRotator();
    rotator.doRequest = async () => {
    };
    rotator.storageRef = storage;
    await rotator.prepare({reuse: 1});


    server_dest = new ProxyServer();
    server_dest.initialize(<IProxyServerOptions>{
      protocol: 'http',
      ip: 'localhost',
      port: 3128,
      level: 3,
      toProxy: false
    });
    await server_dest.start();

    server_distrib = new ProxyServer();
    server_distrib.initialize(<IProxyServerOptions>{
      protocol: 'http',
      ip: 'localhost',
      port: 3180,
      level: 3,
      toProxy: true,
      target: rotator.next.bind(rotator),
      proxyLog: rotator.log.bind(rotator)
    });
    await server_distrib.start();

  }


  static async after() {
    if (server_distrib) {
      await server_distrib.stop();
    }
    if (server_dest) {
      await server_dest.stop();
    }
    await storage.shutdown();

  }

  async before() {
    const c = await storage.connect();
    const data1 = await c.manager.delete(IpRotate, {});
    const data2 = await c.manager.delete(IpRotateLog, {});
    await c.close();
  }

  @test
  async 'rotate and log over http'() {
    const wait = 400;
    const resp1 = await http.get(http_url, opts);

    await TestHelper.wait(wait);
    const c = await storage.connect();
    const data1 = await c.manager.find(IpRotate);
    const data2 = await c.manager.find(IpRotateLog);
    await c.close();

    expect(data1).to.has.length(1);
    expect(data1[0]).to.deep.include({
      successes: 2,
      errors: 0,
      inc: 2,
      used: 2,
      protocol_src: 1,
    });
    // expect(data1[0].duration / 2).to.be.eq(data1[0].duration_average);

    expect(data2).to.has.length(2);
    expect(data2[0].duration).to.be.greaterThan(-1);
    expect(data2[0]).to.deep.include({
      protocol: 1,
      error: null,
      statusCode: 200,
      success: true
    });
  }

  @test
  async 'rotate and log over https'() {
    const wait = 400;

    await http.get(https_url, opts);


    await TestHelper.wait(wait);
    const c = await storage.connect();
    const data1 = await c.manager.find(IpRotate);
    const data2 = await c.manager.find(IpRotateLog);
    await c.close();


    expect(data1).to.has.length(1);
    expect(data1[0]).to.deep.include({
      successes: 2,
      errors: 0,
      inc: 2,
      used: 2,
      protocol_src: 1
    });
    expect(data2).to.has.length(2);
    expect(data2[1].duration).to.be.greaterThan(0);
    expect(data2[1]).to.deep.include({
      protocol: 1,
      error: null,
      statusCode: 200,
      success: true
    });
  }

  @test
  async 'rotate and log over http (failing)'() {
    const wait = 400;
    try {
      const resp1 = await http.get('http://asd-test-site.org/html', opts);

    } catch (_err) {

    }

    await TestHelper.wait(wait);
    const c = await storage.connect();
    const data1 = await c.manager.find(IpRotate);
    const data2 = await c.manager.find(IpRotateLog);
    await c.close();


    expect(data1).to.has.length(1);
    expect(data1[0]).to.deep.include({
      successes: 1,
      errors: 1,
      inc: 2,
      used: 2,
      protocol_src: 1,
    });
    expect(data2).to.has.length(2);
    expect(data2[0].duration).to.be.greaterThan(0);
    expect(data2[0]).to.deep.include({
      protocol: 1,
      statusCode: 504,
      success: false
    });
  }


  @test
  async 'rotate and log over https (failing)'() {
    const wait = 400;
    try {
      const resp1 = await http.get('https://asd-test-site.org/html', opts);
    } catch (_err) {
    }

    await TestHelper.wait(wait);
    const c = await storage.connect();
    const data1 = await c.manager.find(IpRotate);
    const data2 = await c.manager.find(IpRotateLog);
    await c.close();

    expect(data1).to.has.length(1);
    expect(data1[0]).to.deep.include({
      successes: 1,
      errors: 1,
      inc: 2,
      used: 2,
      protocol_src: 1,
    });
    expect(data2).to.has.length(2);
    expect(data2[1].duration).to.be.greaterThan(0);
    expect(data2[1]).to.deep.include({
      protocol: 1,
      statusCode: 504,
      success: false
    });
  }
}
