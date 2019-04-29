import {suite, test, timeout} from "mocha-typescript";

import {expect} from "chai";
import {Log, StorageRef} from "@typexs/base";
import {ProxyServer} from "../../../src/libs/server/ProxyServer";
import {IProxyServerOptions} from "../../../src/libs/server/IProxyServerOptions";
import {IHttpGetOptions} from "../../../src/libs/http/IHttpGetOptions";
import {IHttp} from "../../../src/libs/http/IHttp";
import {HttpGotAdapter} from "../../../src/adapters/http/got/HttpGotAdapter";
import {IHttpResponse} from "../../../src/libs/http/IHttpResponse";

let storage: StorageRef = null;
let server_dest: ProxyServer = null;
let server_distrib: ProxyServer = null;
let opts: IHttpGetOptions = {
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

let http_url = 'http://example.com';
let http_string = 'This domain is established to be used for illustrative examples in documents.';
let https_url = 'https://example.com';
let https_string = http_string;
let http: IHttp = null;

@suite('server/ProxyServer') @timeout(20000)
class ProxyServerTest {


  async before() {
    http = new HttpGotAdapter();
    Log.options({enable: true, level: 'debug'});
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
    let resp1 = <IHttpResponse<any>>await http.get(http_url, opts);
    expect(resp1.body).to.contain(http_string);
  }

  @test
  async 'https success'() {
    // Log.options({enable: true, level: 'debug'})
    let resp1 = <IHttpResponse<any>>await http.get(https_url, opts);
    expect(resp1.body).to.contain(https_string);
  }

  @test
  async 'http failing'() {
    // Http request
    let resp1 = null;
    let err = null;
    Log.debug('http get start')
    try {
      resp1 = await http.get('http://asd-test-site.org/html', opts);
      expect(true).to.be.false
    } catch (_err) {
      err = _err;
      expect(err).to.exist;
      expect(err.message).to.not.contain('expected true to be false');
      resp1 = err.response

    }
    Log.debug('http get stop')

    let erroredResp = err.gotOptions.agent.erroredResponse;
    let json = JSON.parse(erroredResp.headers['proxy-broker-error']);

    delete json.error._error['message'];
    expect(erroredResp.statusCode).to.be.eq(504);
    expect(json.error).to.deep.include({
      _code: 'ADDR_NOT_FOUND',
      _error: {
        code: 'ENOTFOUND',
        "errno": "ENOTFOUND",
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
      resp1 = await http.get('https://asd-test-site.org/html', opts);
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


