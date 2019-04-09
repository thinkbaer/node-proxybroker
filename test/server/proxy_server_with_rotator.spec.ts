import {suite, test, timeout} from "mocha-typescript";
import * as request from "request-promise-native";
import {expect} from "chai";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {IpAddr} from "../../src/entities/IpAddr";
import {IpAddrState} from "../../src/entities/IpAddrState";
import {ProtocolType} from "../../src/libs/specific/ProtocolType";
import {IpRotate} from "../../src/entities/IpRotate";
import {IpRotateLog} from "../../src/entities/IpRotateLog";
import {ProxyServer} from "../../src/libs/server/ProxyServer";
import {ProxyRotator} from "../../src/libs/proxy/ProxyRotator";
import {EventBus} from "commons-eventbus";
import {TestHelper} from "../TestHelper";
import {Invoker, Log, Container, StorageRef} from "@typexs/base";
import {TEST_STORAGE_OPTIONS} from "../config";
import {IProxyServerOptions} from "../../src/libs/server/IProxyServerOptions";


let storage: StorageRef = null;
let server_dest: ProxyServer = null;
let server_distrib: ProxyServer = null;
let opts: request.RequestPromiseOptions = {
  resolveWithFullResponse: true,
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

let http_url = 'http://php.net/support.php'
let http_string = 'A good place to start is by skimming'
let https_url = 'https://nodejs.org/en/about/'
let https_string = 'As an asynchronous event driven JavaScript runtime'


let rotator: ProxyRotator = null


@suite('server/ProxyServer with integrated proxy/ProxyRotator') @timeout(20000)
class ProxyServerTest {


  static async before() {
    Log.options({enable: false, level: 'debug'});
    let invoker = new Invoker();
    Container.set(Invoker.NAME, invoker);
    storage = new StorageRef(TEST_STORAGE_OPTIONS);
    await storage.prepare();

    let c = await storage.connect();


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


    rotator = new ProxyRotator({}, storage);
    await EventBus.register(rotator);


    // Log.options({enable: true, level: 'debug'})
    server_dest = new ProxyServer();
    server_dest.initialize(<IProxyServerOptions>{
      // url: 'http://localhost:3128',
      protocol: 'http',
      ip: 'localhost',
      port: 3128,
      level: 3,
      toProxy: false
    });
    await server_dest.start();

    server_distrib = new ProxyServer();
    server_distrib.initialize(<IProxyServerOptions>{
//            url: 'http://localhost:3180',
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
    await EventBus.unregister(rotator);
    await server_distrib.stop();
    await server_dest.stop();
    await storage.shutdown();
  }


  @test
  async 'rotate and log'() {
    let wait = 400;
    let resp1 = await request.get(http_url, opts);

    await TestHelper.wait(wait);
    let c = await storage.connect();
    let data1 = await c.manager.find(IpRotate);
    let data2 = await c.manager.find(IpRotateLog);
    await c.close();


    expect(data1).to.has.length(1);
    expect(data1[0].duration).to.be.eq(data1[0].duration_average);
    expect(data1[0]).to.deep.include({
      successes: 1,
      errors: 0,
      inc: 1,
      used: 1,
      id: 1,
      protocol_src: 1,
      addr_id: 1,
    });

    expect(data2).to.has.length(1)
    expect(data2[0].duration).to.be.greaterThan(0)
    expect(data2[0]).to.deep.include({
      id: 1,
      protocol: 1,
      addr_id: 1,
      error: null,
      statusCode: 200,
      success: true
    })

    await request.get(https_url, opts);


    await TestHelper.wait(wait)
    c = await storage.connect();
    data1 = await c.manager.find(IpRotate)
    data2 = await c.manager.find(IpRotateLog)
    await c.close()


    expect(data1).to.has.length(1)
    expect(data1[0]).to.deep.include({
      successes: 2,
      errors: 0,
      inc: 2,
      used: 2,
      id: 1,
      protocol_src: 1,
      addr_id: 1,
    })
    expect(data2).to.has.length(2)
    expect(data2[1].duration).to.be.greaterThan(0)
    expect(data2[1]).to.deep.include({
      id: 2,
      protocol: 1,
      addr_id: 1,
      error: null,
      statusCode: 200,
      success: true
    })

    try {
      resp1 = await request.get('http://asd-test-site.org/html', opts);

    } catch (_err) {

    }

    await TestHelper.wait(wait)
    c = await storage.connect();
    data1 = await c.manager.find(IpRotate)
    data2 = await c.manager.find(IpRotateLog)
    await c.close()


    expect(data1).to.has.length(1)
    expect(data1[0]).to.deep.include({
      successes: 2,
      errors: 1,
      inc: 3,
      used: 3,
      id: 1,
      protocol_src: 1,
      addr_id: 1,
    })
    expect(data2).to.has.length(3)
    expect(data2[2].duration).to.be.greaterThan(0)
    expect(data2[2]).to.deep.include({
      id: 3,
      protocol: 1,
      addr_id: 1,
      statusCode: 504,
      success: false
    })


    try {
      resp1 = await request.get('https://asd-test-site.org/html', opts);

    } catch (_err) {

    }

    await TestHelper.wait(wait)
    c = await storage.connect();
    data1 = await c.manager.find(IpRotate)
    data2 = await c.manager.find(IpRotateLog)
    await c.close()


    expect(data1).to.has.length(1)
    expect(data1[0]).to.deep.include({
      successes: 2,
      errors: 2,
      inc: 4,
      used: 4,
      id: 1,
      protocol_src: 1,
      addr_id: 1,
    })
    expect(data2).to.has.length(4)
    expect(data2[3].duration).to.be.greaterThan(0)
    expect(data2[3]).to.deep.include({
      id: 4,
      protocol: 1,
      addr_id: 1,

      statusCode: 504,
      success: false
    })

  }


}


process.on('unhandledRejection', (reason: any, p: any) => {
  console.error(reason)
});

process.on('uncaughtException', (err: any) => {
  console.error(err, err.stack)

});
