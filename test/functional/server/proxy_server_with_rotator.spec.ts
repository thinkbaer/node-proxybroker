import {suite, test, timeout} from 'mocha-typescript';

import {expect} from 'chai';
import {EventBus} from 'commons-eventbus';
import {Log, StorageRef} from '@typexs/base';
import {ProxyServer} from '../../../src/libs/server/ProxyServer';
import {ProxyRotator} from '../../../src/libs/proxy/ProxyRotator';
import {TestHelper} from '../TestHelper';
import {IpAddr} from '../../../src/entities/IpAddr';
import {IpAddrState} from '../../../src/entities/IpAddrState';
import {ProtocolType} from '../../../src/libs/specific/ProtocolType';
import {IProxyServerOptions} from '../../../src/libs/server/IProxyServerOptions';
import {IpRotate} from '../../../src/entities/IpRotate';
import {IpRotateLog} from '../../../src/entities/IpRotateLog';
import {HttpFactory, IHttp, IHttpGetOptions} from 'commons-http';


let storage: StorageRef = null;
let server_dest: ProxyServer = null;
let server_distrib: ProxyServer = null;
const opts: IHttpGetOptions = {
  retry: 0,
  proxy: 'http://localhost:3180',
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

    Log.options({enable: false, level: 'debug'});

    storage = await TestHelper.getDefaultStorageRef();

    const c = await storage.connect();


    let ip = new IpAddr();
    ip.ip = '127.0.0.1';
    ip.port = 3128;
    ip.validation_id = 1;
    ip = await c.save(ip);

    let ips_http = new IpAddrState();
    ips_http.validation_id = ip.validation_id;
    ips_http.protocol_src = ProtocolType.HTTP;
    ips_http.protocol_dest = ProtocolType.HTTP;
    ips_http.addr_id = ip.id;
    ips_http.level = 1;
    ips_http.enabled = true;
    ips_http.duration = 100;
    ips_http = await c.save(ips_http);


    let ips_https = new IpAddrState();
    ips_https.validation_id = ip.validation_id;
    ips_https.protocol_src = ProtocolType.HTTP;
    ips_https.protocol_dest = ProtocolType.HTTPS;
    ips_https.addr_id = ip.id;
    ips_https.enabled = false;

    ips_https.duration = 5000;
    ips_https = await c.save(ips_https);


    rotator = new ProxyRotator();
    rotator.storageRef = storage;


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
      target: rotator.next.bind(rotator)
    });
    await server_distrib.start();

  }


  static async after() {
    await server_distrib.stop();
    await server_dest.stop();
    await storage.shutdown();

  }


  @test.skip
  async 'rotate and log'() {
    const wait = 400;
    let resp1 = await http.get(http_url, opts);

    await TestHelper.wait(wait);
    let c = await storage.connect();
    let data1 = await c.manager.find(IpRotate);
    let data2 = await c.manager.find(IpRotateLog);
    await c.close();

    expect(data1).to.has.length(1);
    expect(data1[0]).to.deep.include({
      successes: 1,
      errors: 0,
      inc: 1,
      used: 1,
      id: 1,
      protocol_src: 1,
      addr_id: 1,
    });
    expect(data1[0].duration).to.be.eq(data1[0].duration_average);

    expect(data2).to.has.length(1);
    expect(data2[0].duration).to.be.greaterThan(0);
    expect(data2[0]).to.deep.include({
      id: 1,
      protocol: 1,
      addr_id: 1,
      error: null,
      statusCode: 200,
      success: true
    });

    await http.get(https_url, opts);


    await TestHelper.wait(wait);
    c = await storage.connect();
    data1 = await c.manager.find(IpRotate);
    data2 = await c.manager.find(IpRotateLog);
    await c.close();


    expect(data1).to.has.length(1);
    expect(data1[0]).to.deep.include({
      successes: 2,
      errors: 0,
      inc: 2,
      used: 2,
      id: 1,
      protocol_src: 1,
      addr_id: 1,
    });
    expect(data2).to.has.length(2);
    expect(data2[1].duration).to.be.greaterThan(0);
    expect(data2[1]).to.deep.include({
      id: 2,
      protocol: 1,
      addr_id: 1,
      error: null,
      statusCode: 200,
      success: true
    });

    try {
      resp1 = await http.get('http://asd-test-site.org/html', opts);

    } catch (_err) {

    }

    await TestHelper.wait(wait);
    c = await storage.connect();
    data1 = await c.manager.find(IpRotate);
    data2 = await c.manager.find(IpRotateLog);
    await c.close();


    expect(data1).to.has.length(1);
    expect(data1[0]).to.deep.include({
      successes: 2,
      errors: 1,
      inc: 3,
      used: 3,
      id: 1,
      protocol_src: 1,
      addr_id: 1,
    });
    expect(data2).to.has.length(3);
    expect(data2[2].duration).to.be.greaterThan(0);
    expect(data2[2]).to.deep.include({
      id: 3,
      protocol: 1,
      addr_id: 1,
      statusCode: 504,
      success: false
    });


    try {
      resp1 = await http.get('https://asd-test-site.org/html', opts);

    } catch (_err) {

    }

    await TestHelper.wait(wait);
    c = await storage.connect();
    data1 = await c.manager.find(IpRotate);
    data2 = await c.manager.find(IpRotateLog);
    await c.close();


    expect(data1).to.has.length(1);
    expect(data1[0]).to.deep.include({
      successes: 2,
      errors: 2,
      inc: 4,
      used: 4,
      id: 1,
      protocol_src: 1,
      addr_id: 1,
    });
    expect(data2).to.has.length(4);
    expect(data2[3].duration).to.be.greaterThan(0);
    expect(data2[3]).to.deep.include({
      id: 4,
      protocol: 1,
      addr_id: 1,

      statusCode: 504,
      success: false
    });

  }


}

//
//
// process.on('unhandledRejection', (reason: any, p: any) => {
//   console.error(reason);
// });
//
// process.on('uncaughtException', (err: any) => {
//   console.error(err, err.stack);
//
// });
