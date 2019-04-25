import {suite, test, timeout} from "mocha-typescript";
import * as request from "request-promise-native";
import {expect} from "chai";
import {Log, StorageRef} from "@typexs/base";
import {ProxyServer} from "../../src/libs/server/ProxyServer";
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

let http_url = 'http://php.net/support.php';
let http_string = 'A good place to start is by skimming';
let https_url = 'https://nodejs.org/en/about/';
let https_string = 'As an asynchronous event driven JavaScript runtime';

@suite('server/ProxyServer') @timeout(20000)
class ProxyServerTest {


  async before() {
    // Log.options({enable: true, level: 'debug'})
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
      target: (header?: any) => {
        Log.debug('headers: ', header);
        return Promise.resolve({hostname: 'localhost', port: 3128, protocol: 'http'})
      }
    });
    await server_distrib.start();

  }


  async after() {
    await server_distrib.stop();
    await server_dest.stop();
  }


  @test
  async 'http success'() {
    let resp1 = await request.get(http_url, opts);
    expect(resp1.body).to.contain(http_string);
  }

  @test
  async 'https success'() {
    // Log.options({enable: true, level: 'debug'})
    let resp1 = await request.get(https_url, opts);
    expect(resp1.body).to.contain(https_string);
  }

  @test
  async 'http failing'() {
    // Http request
    let resp1 = null;
    let err = null;
    try {
      resp1 = await request.get('http://asd-test-site.org/html', opts);
      expect(true).to.be.false
    } catch (_err) {
      err = _err;
      expect(err).to.exist;
      expect(err.message).to.not.contain('expected true to be false');
      resp1 = err.response

    }

    let json = JSON.parse(resp1.headers['proxy-broker-error']);

    expect(resp1.statusCode).to.be.eq(504);
    expect(json.error).to.deep.include({
      _code: 'ADDR_NOT_FOUND', _error: {
        code: 'ENOTFOUND', "errno": "ENOTFOUND",
        "host": "asd-test-site.org",
        "hostname": "asd-test-site.org",
        "port": 80,
        "syscall": "getaddrinfo",
      }
    });
  }

  @test
  async 'https failing'() {
    // Log.options({enable:true,level:'debug'})
    // Http request
    let resp1 = null;
    let err = null;
    try {
      resp1 = await request.get('https://asd-test-site.org/html', opts);
      expect(true).to.be.false
    } catch (_err) {

      err = _err;
      expect(err).to.exist;
      expect(err.message).to.not.contain('expected true to be false');
      resp1 = err.response;

    }


    expect(err.message).to.contain('tunneling socket could not be established, statusCode=504')

  }

}


