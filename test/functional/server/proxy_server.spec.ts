import {suite, test} from 'mocha-typescript';

import {expect} from 'chai';
import {Log, StorageRef} from '@typexs/base';
import {ProxyServer} from '../../../src/libs/server/ProxyServer';
import {IProxyServerOptions} from '../../../src/libs/server/IProxyServerOptions';

import {HttpFactory, IHttp, IHttpGetOptions, IHttpResponse} from 'commons-http';

const storage: StorageRef = null;
let server_dest: ProxyServer = null;
let server_distrib: ProxyServer = null;
const opts: IHttpGetOptions = {
  retry: 0,
  proxy: 'http://localhost:3180',
  proxyHeaders: {
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
const http_string = 'This domain is established to be used for illustrative examples in documents.';
const https_url = 'https://example.com';
const https_string = http_string;
let http: IHttp = null;

@suite('server/proxy_server')
class ProxyServerTest {


  async before() {
    http = HttpFactory.create();

    Log.options({enable: false, level: 'debug', loggers: [{name: '*', enable: false, level: 'debug'}]});
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
        return Promise.resolve({hostname: 'localhost', port: 3128, protocol: 'http'});
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
    const resp1 = <IHttpResponse<any>>await http.get(http_url, opts);
    expect(resp1.body).to.contain(http_string);
  }

  @test
  async 'https success'() {
    // Log.options({enable: true, level: 'debug'})
    const resp1 = <IHttpResponse<any>>await http.get(https_url, opts);
    expect(resp1.body).to.contain(https_string);
  }

  @test
  async 'http failing'() {
    // Http request
    let resp1 = null;
    let err = null;
    Log.debug('http get start');
    try {
      resp1 = await http.get('http://exa-as-mple.com', opts);
      expect(true).to.be.false;
    } catch (_err) {
      err = _err;
      expect(err).to.exist;
      expect(err.message).to.not.contain('expected true to be false');
      resp1 = err.response;

    }

    // const erroredResp = err.gotOptions.agent.erroredResponse;
    const json = JSON.parse(err.headers['proxy-broker-error']);

    delete json.error._error['message'];
    expect(err.statusCode).to.be.eq(504);
    expect(err.headers['proxy-broker']).to.be.eq('Failed');
    expect(json.error).to.deep.include({
      _code: 'ADDR_NOT_FOUND',
      _error: {
        code: 'ENOTFOUND',
        'errno': 'ENOTFOUND',
        'host': 'exa-as-mple.com',
        'hostname': 'exa-as-mple.com',
        'port': 80,
        'syscall': 'getaddrinfo',
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
      resp1 = await http.get('https://exa-as-mple.com', opts);
      expect(true).to.be.false;
    } catch (_err) {

      err = _err;
      expect(err).to.exist;
      expect(err.message).to.not.contain('expected true to be false');
      resp1 = err.response;

    }


    expect(err.message).to.contain('Response code 504 (Gateway Time-out)');
    const json = JSON.parse(err.headers['proxy-broker-error']);

    delete json.error._error['message'];
    expect(err.statusCode).to.be.eq(504);
    expect(err.headers['proxy-broker']).to.be.eq('Failed');
    expect(json.error).to.deep.include({
      _code: 'ADDR_NOT_FOUND',
      _error: {
        code: 'ENOTFOUND',
        'errno': 'ENOTFOUND',
        'host': 'exa-as-mple.com',
        'hostname': 'exa-as-mple.com',
        'port': 443,
        'syscall': 'getaddrinfo',
      }
    });

  }

}


