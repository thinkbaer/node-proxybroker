import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {IProxyServerOptions} from "../../../src/libs/server/IProxyServerOptions";
import {IJudgeOptions} from "../../../src/libs/judge/IJudgeOptions";
import {TestHelper} from "../TestHelper";
import {Log} from "@typexs/base";
import {ProxyServer} from "../../../src/libs/server/ProxyServer";
import {ProxyValidator} from "../../../src/libs/proxy/ProxyValidator";
import {ProxyDataValidateEvent} from "../../../src/libs/proxy/ProxyDataValidateEvent";
import {ProxyData} from "../../../src/libs/proxy/ProxyData";
import {IpAddr} from "../../../src/entities/IpAddr";
import {IpAddrState} from "../../../src/entities/IpAddrState";
import {ProtocolType} from "../../../src/libs/specific/ProtocolType";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


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
    socket_timeout: 5000,
    connection_timeout: 1000
  }
};

@suite('proxy/ProxyValidator') @timeout(10000)
class ProxyValidationControllerTest {

  static before() {
    Log.options({enable: false, level: 'debug'})
  }

  @test
  async 'positiv validation for http proxy'() {
    let storage = await TestHelper.getDefaultStorageRef();

    let http_proxy_server = new ProxyServer();
    http_proxy_server.initialize(http_proxy_options);
    let proxyValidationController = new ProxyValidator({schedule: {enable: false}, judge: judge_options}, storage);
    await proxyValidationController.prepare();
    await http_proxy_server.start();

    let proxyData = new ProxyData({ip: '127.0.0.1', port: 3128});
    let e = new ProxyDataValidateEvent(proxyData);
    let event = null;
    try {
      event = await proxyValidationController.validate(e)
    } catch (err) {
      throw err
    }
    await proxyValidationController.shutdown();
    await http_proxy_server.stop();


    let conn = await storage.connect();
    //let ip_loc = await conn.manager.findAndCount(IpLoc);
    let ip_addr = await conn.manager.findAndCount(IpAddr);
    let ip_addr_state = await conn.manager.findAndCount(IpAddrState);

    await conn.close();
    await storage.shutdown();

    //expect(ip_loc[1]).to.eq(1);
    expect(ip_addr[1]).to.eq(1);
    expect(ip_addr_state[1]).to.eq(4);


    let http_http = event.data.results.getVariant(ProtocolType.HTTP, ProtocolType.HTTP);
    let http_https = event.data.results.getVariant(ProtocolType.HTTP, ProtocolType.HTTPS);
    let https_http = event.data.results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTP);
    let https_https = event.data.results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTPS);

    expect(http_http.hasError()).to.be.false;
    expect(http_http.level).to.eq(3);
    expect(http_https.hasError()).to.be.false;
    expect(http_https.level).to.eq(1);
    expect(https_http.hasError()).to.be.true;
    expect(https_https.hasError()).to.be.true

  }

  @test.skip()
  async 'positiv validation for https proxy'() {
  }

  @test
  async 'negativ validation'() {
    let storage = await TestHelper.getDefaultStorageRef();

    let proxyValidationController = new ProxyValidator({schedule: {enable: false}, judge: judge_options}, storage);
    await proxyValidationController.prepare();

    let proxyData = new ProxyData({ip: '127.0.0.30', port: 3128});
    let e = new ProxyDataValidateEvent(proxyData);
    let event = null;
    try {

      event = await proxyValidationController.validate(e);

    } catch (err) {
      throw err
    }
    // await proxyValidationController.await()
    await proxyValidationController.shutdown();


//     let conn = await storage.connect();
// //    let ip_loc = await conn.manager.findAndCount(IpLoc);
//     let ip_addr = await conn.manager.findAndCount(IpAddr);
//     let ip_addr_state = await conn.manager.findAndCount(IpAddrState);
//
//     await conn.close();
    await storage.shutdown();

    //  expect(ip_loc[1]).to.eq(1);
    // expect(ip_addr[1]).to.eq(1);
    // expect(ip_addr_state[1]).to.eq(4);
    //
    // expect(ip_addr[0][0].count_errors).to.eq(1);
    // expect(ip_addr[0][0].success_since_at).to.be.null;
    //
    // expect(ip_addr_state[0][0].enabled).to.be.false;
    // expect(ip_addr_state[0][1].enabled).to.be.false

  }
}
