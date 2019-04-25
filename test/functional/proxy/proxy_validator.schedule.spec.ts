import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {DateUtils} from "typeorm/util/DateUtils";
import {Log} from "@typexs/base";
import {EventBus} from "commons-eventbus";
import {IProxyServerOptions} from "../../../src/libs/server/IProxyServerOptions";
import {IJudgeOptions} from "../../../src/libs/judge/IJudgeOptions";
import {TestHelper} from "../TestHelper";
import {IpAddr} from "../../../src/entities/IpAddr";
import {ProxyServer} from "../../../src/libs/server/ProxyServer";
import {ProxyValidator} from "../../../src/libs/proxy/ProxyValidator";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const proxy_options: IProxyServerOptions = <IProxyServerOptions>{

  ip: '127.0.0.1',
  port: 3128,
  protocol: 'http',
  level: 3,
  toProxy: false
};

const judge_options: IJudgeOptions = {
  remote_lookup: false,
  selftest: false,
  ip: '127.0.0.1'
};

@suite('proxy/ProxyValidator - schedule') @timeout(20000)
class ProxyValidationControllerTest {

  static before() {
    Log.options({enable: false, level: 'debug'});
  }

  @test
  async 'records selection query'() {
    let storage =await TestHelper.getDefaultStorageRef();

    let ip = new IpAddr();
    ip.ip = '127.0.0.1';
    ip.port = 3128;

    let c = await storage.connect();
    await c.manager.save(ip);
    let ips = await c.manager.find(IpAddr);

    let q = c.manager.getRepository(IpAddr).createQueryBuilder('ip');
    q.where('ip.blocked = :blocked and ip.to_delete = :to_delete and (ip.last_checked_at IS NULL OR ip.last_checked_at < :date) ', {
      blocked: false,
      to_delete: false,
      date: DateUtils.mixedDateToDatetimeString(new Date(Date.now() - 6 * 60 * 60 * 1000))
    });

    let _ips: IpAddr[] = await q.getMany();
    expect(_ips).to.have.length(1);
    ip.last_checked_at = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await c.manager.save(ip);
    ips = await c.manager.find(IpAddr);
    q = c.manager.getRepository(IpAddr).createQueryBuilder('ip');
    q.where('ip.blocked = :blocked and ip.to_delete = :to_delete and (ip.last_checked_at IS NULL OR ip.last_checked_at < :date) ', {
      blocked: false,
      to_delete: false,
      date: DateUtils.mixedDateToDatetimeString((new Date(Date.now() - 12 * 60 * 60 * 1000)))
    });

    _ips = await q.getMany();
    expect(_ips).to.have.length(1);

    q.where('ip.blocked = :blocked and ip.to_delete = :to_delete and (ip.last_checked_at IS NULL OR ip.last_checked_at < :date) ', {
      blocked: false,
      to_delete: false,
      date: DateUtils.mixedDateToDatetimeString(new Date(Date.now() - 48 * 60 * 60 * 1000))
    });
    _ips = await q.getMany();

    expect(_ips).to.have.length(0);
    await c.close();
    await storage.shutdown();
  }


  @test
  async 'test scheduled task'() {

     //Log.options({enable:true,level:'debug'})
    let now = new Date();

    let storage =await TestHelper.getDefaultStorageRef();

    let ip = new IpAddr();
    ip.ip = '127.0.0.1';
    ip.port = 3128;

    let c = await storage.connect();
    await c.manager.save(ip);
    let http_proxy_server = new ProxyServer();
    http_proxy_server.initialize(proxy_options);
    await http_proxy_server.start();


    let sec = ((new Date()).getSeconds() + 2) % 60;
    let proxyValidationController = new ProxyValidator({
      schedule: {enable: true, pattern: sec + ' * * * * *'},
      judge: judge_options
    }, storage);


    await proxyValidationController.prepare();
    await TestHelper.wait(2000);

    await proxyValidationController.await();
    await TestHelper.wait(2000);

    await proxyValidationController.shutdown();
    await http_proxy_server.stop();

    await c.close();

    let conn = await storage.connect();

    let ip_addr = await conn.manager.findOne(IpAddr);
    // let ip_addr_state = await conn.manager.find(IpAddrState);

    await conn.close();
    await storage.shutdown();

    //console.log(ip_addr)
    //console.log(ip_addr_state)
    expect(ip_addr.last_checked_at.getTime()).to.be.greaterThan(now.getTime());
    expect(ip_addr.count_success).to.be.eq(1);
    expect(ip_addr.protocols_src).to.be.eq(1);
    expect(ip_addr.protocols_dest).to.be.eq(3);

    /*
    expect(ip_addr_state[0].level).to.be.eq(3)
    expect(ip_addr_state[0].validation_id).to.be.eq(1)
    expect(ip_addr_state[1].level).to.be.eq(-1)
    expect(ip_addr_state[1].validation_id).to.be.eq(1)
    */
  }

}
