import * as _ from 'lodash';
import {suite, test, timeout} from 'mocha-typescript';
import {expect} from 'chai';
import {DateUtils} from 'typeorm/util/DateUtils';
import {Log} from '@typexs/base';
import {IProxyServerOptions} from '../../../src/libs/server/IProxyServerOptions';
import {IJudgeOptions} from '../../../src/libs/judge/IJudgeOptions';
import {TestHelper} from '../TestHelper';
import {IpAddr} from '../../../src/entities/IpAddr';
import {ProxyServer} from '../../../src/libs/server/ProxyServer';
import {ProxyValidator} from '../../../src/libs/proxy/ProxyValidator';
import {Scheduler} from '@typexs/base/libs/schedule/Scheduler';
import {ValidatorRunEvent} from '../../../src/libs/proxy/ValidatorRunEvent';
import {IScheduleDef} from '@typexs/base/libs/schedule/IScheduleDef';
import {DefaultScheduleFactory} from '@typexs/base/adapters/scheduler/DefaultScheduleFactory';
import {EventScheduleFactory} from '@typexs/base/adapters/scheduler/EventExecuteFactory';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

@suite('proxy/proxy_validator_schedule') @timeout(20000)
class ProxyValidationControllerTest {

  static before() {
    Log.options({enable: false, level: 'debug', loggers: [{enable: false, name: '*'}]});
  }

  @test
  async 'records selection query'() {
    const storage = await TestHelper.getDefaultStorageRef();

    const ip = new IpAddr();
    ip.ip = '127.0.0.1';
    ip.port = 3128;

    const c = await storage.connect();
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

    // Log.options({enable:true,level:'debug'})
    const now = new Date();

    const storage = await TestHelper.getDefaultStorageRef();

    const ip = new IpAddr();
    ip.ip = '127.0.0.1';
    ip.port = 3128;

    const c = await storage.connect();
    await c.manager.save(ip);


    const http_proxy_server = new ProxyServer();
    http_proxy_server.initialize(proxy_options);
    await http_proxy_server.start();


    // const sec = ((new Date()).getSeconds() + 2) % 60;


    const proxyValidationController = new ProxyValidator();
    proxyValidationController.initialize({
      judge: judge_options
    }, storage);

    const scheduler = new Scheduler();
    await scheduler.prepare([new DefaultScheduleFactory(), new EventScheduleFactory()]);
    await scheduler.register(<IScheduleDef>{
      name: 'test_schedule',
      offset: '1s',
      event: {
        name: _.snakeCase(ValidatorRunEvent.name)
      }
    });


    await proxyValidationController.prepare();
    await TestHelper.wait(1000);

    await proxyValidationController.await();
    await TestHelper.wait(1000);

    await proxyValidationController.shutdown();
    await http_proxy_server.stop();
    await http_proxy_server.shutdown();
    await scheduler.shutdown();

    await c.close();

    const conn = await storage.connect();

    const ip_addr = await conn.manager.findOne(IpAddr);
    // let ip_addr_state = await conn.manager.find(IpAddrState);

    await conn.close();
    await storage.shutdown();

    // console.log(ip_addr)
    // console.log(ip_addr_state)
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
