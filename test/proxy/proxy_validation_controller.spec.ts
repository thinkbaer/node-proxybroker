import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'
import {ProxyValidationController} from "../../src/proxy/ProxyValidationController";
import {IProxyServerOptions} from "../../src/server/IProxyServerOptions";
import {ProxyServer} from "../../src/server/ProxyServer";
import {IJudgeOptions} from "../../src/judge/IJudgeOptions";
import {ProxyDataValidateEvent} from "../../src/proxy/ProxyDataValidateEvent";
import {ProxyData} from "../../src/proxy/ProxyData";
import {Storage} from "../../src/storage/Storage";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {IpLoc} from "../../src/model/IpLoc";
import {IpAddr} from "../../src/model/IpAddr";
import {IpAddrState} from "../../src/model/IpAddrState";
import {Container} from "typedi";

const proxy_options: IProxyServerOptions = Object.assign({}, {
    url: 'http://127.0.0.1:3128',
    level: 3
});

const judge_options: IJudgeOptions = {
    remote_lookup: false,
    selftest: false,
    judge_url: "http://127.0.0.1:8080"
};

@suite('proxy/ProxyValidationController') @timeout(10000)
class ProxyValidationControllerTest {

    @test
    async 'positiv validation'() {

        let storage = new Storage(<SqliteConnectionOptions>{
            name: 'proxy_validator_controller',
            type: 'sqlite',
            database: ':memory:'
        });
        await storage.init();

        let http_proxy_server = new ProxyServer(proxy_options);
        let proxyValidationController = new ProxyValidationController(judge_options, storage);
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
        // await proxyValidationController.await()
        await proxyValidationController.shutdown();
        await http_proxy_server.stop();


        let conn = await storage.connect();
        let ip_loc = await conn.manager.findAndCount(IpLoc);
        let ip_addr = await conn.manager.findAndCount(IpAddr);
        let ip_addr_state = await conn.manager.findAndCount(IpAddrState);

        await conn.close();
        await storage.shutdown();

        expect(ip_loc[1]).to.eq(1);
        expect(ip_addr[1]).to.eq(1);
        expect(ip_addr_state[1]).to.eq(2);

        expect(event.data.results).to.exist;
        expect(event.data.results.http).to.exist;
        expect(event.data.results.https).to.exist;
        expect(event.data.results.https.error).to.exist;
        expect(event.data.results.https.level).to.eq(-1);
        expect(event.data.results.http).to.deep.include({
            error: null,
            level: 3
        })
    }

    @test
    async 'negativ validation'() {

        let storage = new Storage(<SqliteConnectionOptions>{
            name: 'proxy_validator_controller2',
            type: 'sqlite',
            database: ':memory:'
        });
        await storage.init();
        let proxyValidationController = new ProxyValidationController(judge_options, storage);
        await proxyValidationController.prepare();

        let proxyData = new ProxyData({ip: '127.0.0.30', port: 3128});
        let e = new ProxyDataValidateEvent(proxyData);
        let event = null;
        try {
            event = await proxyValidationController.validate(e)
        } catch (err) {
            throw err
        }
        // await proxyValidationController.await()
        await proxyValidationController.shutdown();


        let conn = await storage.connect();
        let ip_loc = await conn.manager.findAndCount(IpLoc);
        let ip_addr = await conn.manager.findAndCount(IpAddr);
        let ip_addr_state = await conn.manager.findAndCount(IpAddrState);

        await conn.close();
        await storage.shutdown();

        expect(ip_loc[1]).to.eq(1);
        expect(ip_addr[1]).to.eq(1);
        expect(ip_addr_state[1]).to.eq(2);

        expect(ip_addr[0][0].count_errors).to.eq(1);
        expect(ip_addr[0][0].success_since_at).to.be.null;

        expect(ip_addr_state[0][0].enabled).to.be.false;
        expect(ip_addr_state[0][1].enabled).to.be.false
    }
}