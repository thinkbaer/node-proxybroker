import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {ProxyValidator} from "../../src/proxy/ProxyValidator";
import {IProxyServerOptions} from "../../src/server/IProxyServerOptions";
import {ProxyServer} from "../../src/server/ProxyServer";
import {IJudgeOptions} from "../../src/judge/IJudgeOptions";
import {Storage} from "../../src/storage/Storage";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {IpAddr} from "../../src/model/IpAddr";
import {IpAddrState} from "../../src/model/IpAddrState";
import {Log} from "../../src/lib/logging/Log";
import {EventBus} from "../../src/events/EventBus";
import {DateUtils} from "typeorm/util/DateUtils";
import moment = require("moment");
describe('', () => {
});


const proxy_options: IProxyServerOptions = Object.assign({}, {
    url: 'http://127.0.0.1:3128',
    level: 3
});

const judge_options: IJudgeOptions = {
    remote_lookup: false,
    selftest: false,
    judge_url: "http://127.0.0.1:8080"
};

@suite('proxy/ProxyValidator - schedule') @timeout(20000)
class ProxyValidationControllerTest {

    static before() {
        Log.options({enable: false})
    }

    @test
    async 'records selection query'() {

        let storage = new Storage(<SqliteConnectionOptions>{
            name: 'proxy_validator_schedule',
            type: 'sqlite',
            database: ':memory:'
        });
        await storage.init();

        let ip = new IpAddr()
        ip.ip = '127.0.0.1'
        ip.port = 3128

        let c = await storage.connect()
        await c.manager.save(ip)
        let ips = await c.manager.find(IpAddr)

        let q = c.manager.getRepository(IpAddr).createQueryBuilder('ip')
        q.where('ip.blocked = :blocked and ip.to_delete = :to_delete and (ip.last_checked_at IS NULL OR ip.last_checked_at < :date) ', {
            blocked: false,
            to_delete: false,
            date: DateUtils.mixedDateToDatetimeString(new Date(Date.now() - 6 * 60 * 60 * 1000))
        })

        let _ips: IpAddr[] = await q.getMany()
        expect(_ips).to.have.length(1)
        ip.last_checked_at = new Date(Date.now() - 24 * 60 * 60 * 1000)
        await c.manager.save(ip)
        ips = await c.manager.find(IpAddr)
        q = c.manager.getRepository(IpAddr).createQueryBuilder('ip')
        q.where('ip.blocked = :blocked and ip.to_delete = :to_delete and (ip.last_checked_at IS NULL OR ip.last_checked_at < :date) ', {
            blocked: false,
            to_delete: false,
            date: DateUtils.mixedDateToDatetimeString((new Date(Date.now() - 12 * 60 * 60 * 1000)))
        })

        _ips = await q.getMany()
        expect(_ips).to.have.length(1)

        q.where('ip.blocked = :blocked and ip.to_delete = :to_delete and (ip.last_checked_at IS NULL OR ip.last_checked_at < :date) ', {
            blocked: false,
            to_delete: false,
            date: DateUtils.mixedDateToDatetimeString(new Date(Date.now() - 48 * 60 * 60 * 1000))
        })
        _ips = await q.getMany()

        expect(_ips).to.have.length(0)
        await c.close()
        await storage.shutdown();
    }


    @test.only()
    async 'schedule'() {

        // Log.options({enable:true})
        let now = new Date()

        let storage = new Storage(<SqliteConnectionOptions>{
            name: 'proxy_validator_schedule2',
            type: 'sqlite',
            database: ':memory:'
        });
        await storage.init();

        let ip = new IpAddr()
        ip.ip = '127.0.0.1'
        ip.port = 3128

        let c = await storage.connect()
        await c.manager.save(ip)
        let http_proxy_server = new ProxyServer(proxy_options);
        await http_proxy_server.start()


        let sec = ((new Date()).getSeconds() + 2) % 60
        let proxyValidationController = new ProxyValidator({
            schedule: {enable: true, pattern: sec + ' * * * * *'},
            judge: judge_options
        }, storage);

        EventBus.register(proxyValidationController)
        await proxyValidationController.prepare();



        await new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve(true)
            }, 2000)
        })
        await proxyValidationController.await();

        await new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve(true)
            }, 2000)
        })

        await proxyValidationController.shutdown();
        await http_proxy_server.stop();

        await c.close();

        let conn = await storage.connect();

        let ip_addr = await conn.manager.findOne(IpAddr);
        let ip_addr_state = await conn.manager.find(IpAddrState);

        await conn.close();
        await storage.shutdown();

        expect(ip_addr.last_checked_at.getTime()).to.be.greaterThan(now.getTime())
        expect(ip_addr.count_success).to.be.eq(1)
        expect(ip_addr.protocols).to.be.eq(1)
        expect(ip_addr_state[0].level).to.be.eq(3)
        expect(ip_addr_state[0].validation_id).to.be.eq(1)
        expect(ip_addr_state[1].level).to.be.eq(-1)
        expect(ip_addr_state[1].validation_id).to.be.eq(1)
    }

}