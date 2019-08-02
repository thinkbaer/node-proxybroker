import {suite, test, timeout} from 'mocha-typescript';
import {Log, StorageRef} from '@typexs/base';
import {ProxyServer} from '../../../src/libs/server/ProxyServer';
import {ProxyRotator} from '../../../src/libs/proxy/ProxyRotator';
import {TestHelper} from '../TestHelper';
import {IpAddr} from '../../../src/entities/IpAddr';
import {IpAddrState} from '../../../src/entities/IpAddrState';
import {ProtocolType} from '../../../src/libs/specific/ProtocolType';
import {IProxyServerOptions} from '../../../src/libs/server/IProxyServerOptions';
import {HttpFactory, IHttp, IHttpGetOptions} from 'commons-http';
import {TestProxyServer} from './dummy/TestProxyServer';


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


const http_url = 'http://example.com';
// let http_string = 'A good place to start is by skimming';
const https_url = 'https://example.com';
// let https_string = 'As an asynchronous event driven JavaScript runtime';


let rotator: ProxyRotator = null;
let http: IHttp = null;

@suite('functional/server/' + __filename.replace(__dirname + '/', '')) @timeout(20000)
class ProxyServerFailingsTest {


  static async before() {
    http = HttpFactory.create();

    Log.options({enable: true, level: 'debug', loggers: [{name: '*', enable: true, level: 'debug'}]});

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


    server_dest = new TestProxyServer((req, res) => {
      res.writeHead(403, 'Forbidden');
      res.write('Is an error');
      res.end();
    });

    server_dest.initialize(<IProxyServerOptions>{
      protocol: 'http',
      ip: 'localhost',
      port: 3128,
      toProxy: false
    });
    await server_dest.start();

    server_distrib = new ProxyServer();
    server_distrib.initialize(<IProxyServerOptions>{
      protocol: 'http',
      ip: 'localhost',
      port: 3180,
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
  async 'proxy failing by forbid'() {
    const wait = 400;
    let resp1 = await http.get(http_url, opts);
    console.log(resp1);
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
