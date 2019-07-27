import {suite, test, timeout} from 'mocha-typescript';
import {expect} from 'chai';
import {IProxyServerOptions} from '../../../src/libs/server/IProxyServerOptions';
import {IJudgeOptions} from '../../../src/libs/judge/IJudgeOptions';
import {TestHelper} from '../TestHelper';
import {Log} from '@typexs/base';
import {ProxyServer} from '../../../src/libs/server/ProxyServer';
import {ProxyValidator} from '../../../src/libs/proxy/ProxyValidator';
import {ProxyData} from '../../../src/libs/proxy/ProxyData';
import {IpAddr} from '../../../src/entities/IpAddr';
import {IpAddrState} from '../../../src/entities/IpAddrState';
import {ProtocolType} from '../../../src/libs/specific/ProtocolType';
import {ProxyDataValidateEvent} from '../../../src/event/ProxyDataValidateEvent';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


const http_proxy_options: IProxyServerOptions = <IProxyServerOptions>{
  protocol: 'http',
  ip: '127.0.0.1',
  port: 3128,
  level: 3,
  toProxy: false
};

const judge_options: IJudgeOptions = {
  remote_lookup: false,
  selftest: false,
  ip: 'judge.local',
  remote_ip: 'judge.local',
  request: {
    local_ip: '127.0.0.1',
    timeout: 5000,
    // connection_timeout: 1000
  }
};

@suite('proxy/proxy_validator')
class ProxyValidationControllerTest {

  static before() {
    Log.options({enable: false, level: 'debug'});
  }

  @test
  async 'positiv validation for http proxy'() {
    const storage = await TestHelper.getDefaultStorageRef();

    const http_proxy_server = new ProxyServer();
    http_proxy_server.initialize(http_proxy_options);
    const proxyValidationController = new ProxyValidator();
    proxyValidationController.initialize({judge: judge_options}, storage);
    await proxyValidationController.prepare();
    await http_proxy_server.start();

    const proxyData = new ProxyData({ip: '127.0.0.1', port: 3128});
    const e = new ProxyDataValidateEvent(proxyData);
    let event = null;
    try {
      event = await proxyValidationController.validate(e);
    } catch (err) {
      throw err;
    }
    await proxyValidationController.shutdown();
    await http_proxy_server.stop();


    const conn = await storage.connect();
    // let ip_loc = await conn.manager.findAndCount(IpLoc);
    const ip_addr = await conn.manager.findAndCount(IpAddr);
    const ip_addr_state = await conn.manager.findAndCount(IpAddrState);

    await conn.close();
    await storage.shutdown();

    // expect(ip_loc[1]).to.eq(1);
    expect(ip_addr[1]).to.eq(1);
    expect(ip_addr_state[1]).to.eq(4);


    const http_http = event.data.results.getVariant(ProtocolType.HTTP, ProtocolType.HTTP);
    const http_https = event.data.results.getVariant(ProtocolType.HTTP, ProtocolType.HTTPS);
    const https_http = event.data.results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTP);
    const https_https = event.data.results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTPS);

    expect(http_http.hasError()).to.be.false;
    expect(http_http.level).to.eq(3);
    expect(http_https.hasError()).to.be.false;
    expect(http_https.level).to.eq(1);
    expect(https_http.hasError()).to.be.true;
    expect(https_https.hasError()).to.be.true;

  }

  @test.skip()
  async 'positiv validation for https proxy'() {
  }

  @test
  async 'negativ validation'() {
    const storage = await TestHelper.getDefaultStorageRef();

    const proxyValidationController = new ProxyValidator();
    proxyValidationController.initialize({judge: judge_options}, storage);
    await proxyValidationController.prepare();

    const proxyData = new ProxyData({ip: '127.0.0.30', port: 3128});
    const e = new ProxyDataValidateEvent(proxyData);
    let event = null;
    try {
      event = await proxyValidationController.validate(e);
    } catch (err) {
      throw err;
    }
    // await proxyValidationController.await()
    await proxyValidationController.shutdown();
    await storage.shutdown();
  }
}
