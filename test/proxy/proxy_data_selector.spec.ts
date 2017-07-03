import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'
import {Storage} from "../../src/storage/Storage";
import {ProxyDataSelector} from "../../src/proxy/ProxyDataSelector";
import {ProxyDataFetchedEvent} from "../../src/proxy/ProxyDataFetchedEvent";
import {IProxyData} from "../../src/proxy/IProxyData";
import {IpAddr} from "../../src/storage/entity/IpAddr";
import subscribe from "../../src/events/decorator/subscribe"
import {ProxyDataValidateEvent} from "../../src/proxy/ProxyDataValidateEvent";
import {EventBus} from "../../src/events/EventBus";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Utils} from "../../src/utils/Utils";

@suite('proxy/ProxyDataSelector')
class ProxyDataSelectorTest {


    @test
    async 'init'() {
        let storage = await Storage.$(<SqliteConnectionOptions>{
            name: 'proxy_data_validator',

            type: 'sqlite',
            database: ':memory:'

        })
        let proxy_data_selector = new ProxyDataSelector(storage)
        expect(proxy_data_selector).to.exist
        await storage.shutdown()
    }


    @test
    async 'verify if validation is necessary'() {
        let storage = await Storage.$(<SqliteConnectionOptions>{
            name: 'proxy_data_validator',

            type: 'sqlite',
            database: ':memory:'

        })
        let proxy_data_selector = new ProxyDataSelector(storage)
        let c = await storage.connect()

        let p = new IpAddr()
        p.ip = '192.0.0.1'
        p.port = 3129
        p.last_checked_at = Utils.now()
        await c.persist(p)


        let events = await proxy_data_selector.do([{ip: '192.0.0.1', port: 3129}, {ip: '127.0.1.1', port: 3128}])
        expect(events.length).to.be.eq(1)
        expect(events[0]).to.deep.eq({
            isNew: true,
            record: null,
            fired: true,
            data: {
                results: null, ip: '127.0.1.1', port: 3128
            }
        })

        p.last_checked_at = new Date((new Date()).getTime() - 36 * 60 * 60 * 1000)
        await c.persist(p)

        events = await proxy_data_selector.do([{ip: '192.0.0.1', port: 3129}, {ip: '127.0.0.1', port: 3128}])
        expect(events.length).to.be.eq(2)
        expect(events[0].isNew).to.be.false
        expect(events[0].record).to.deep.include({
            id: 1,
            ip: '192.0.0.1',
            port: 3129,
            blocked: false
        })
        expect(events[1]).to.deep.eq({
            isNew: true,
            record: null,
            fired: true,
            data: {
                results: null, ip: '127.0.0.1', port: 3128
            }
        })

        // Test subscribe if the events are fired
        class X01 {
            _test: Function = null

            constructor(test: Function) {
                this._test = test
            }

            @subscribe(ProxyDataValidateEvent)
            test(p: ProxyDataValidateEvent) {
                this._test(p)
            }
        }

        let x01 = new X01(function (e: ProxyDataValidateEvent) {
            expect(e.record).to.deep.include({
                id: 1,
                ip: '192.0.0.1',
                port: 3129,
                blocked: false
            })
        })

        EventBus.register(x01)
        await proxy_data_selector.do([{ip: '192.0.0.1', port: 3129}])
        EventBus.unregister(x01)

        // Test blocked or to_delete flags
        p = new IpAddr()
        p.ip = '192.0.0.2'
        p.port = 3129
        p.blocked = true
        await c.persist(p)

        p = new IpAddr()
        p.ip = '192.0.0.3'
        p.port = 3129
        p.to_delete = true
        await c.persist(p)

        events = await proxy_data_selector.do([{ip: '192.0.0.2', port: 3129}, {ip: '192.0.0.3', port: 3129}])
        expect(events.length).to.eq(0)

        await storage.shutdown()
    }


    @test
    async 'filter'() {
        let addr = {ip: '127.0.0.1', port: 3128}
        class ProxyDataSelectorFilterTest extends ProxyDataSelector {
            test: Function

            constructor(storage: Storage, cb: Function) {
                super(storage)
                this.test = cb
            }

            async do(workLoad: IProxyData[]): Promise<any> {
                this.test(workLoad)
            }
        }

        let storage = await Storage.$(<SqliteConnectionOptions>{
            name: 'proxy_data_validator',
            type: 'sqlite',
            database: ':memory:'

        })

        let proxy_data_selector = new ProxyDataSelectorFilterTest(storage, (w: IProxyData[]) => {
            expect(w).to.deep.eq([addr])
        })

        let e = new ProxyDataFetchedEvent(addr)
        proxy_data_selector.filter(e)
        await e;

        e = new ProxyDataFetchedEvent([addr])
        proxy_data_selector.filter(e)
        await e;

        proxy_data_selector = new ProxyDataSelectorFilterTest(storage, (w: IProxyData[]) => {
            expect(true).to.be.false
        })

        // should be ignored
        e = new ProxyDataFetchedEvent([{ip: '999.999.999.999', port: 3128}])
        proxy_data_selector.filter(e)
        await e;

        // should be ignored
        e = new ProxyDataFetchedEvent([{ip: '127.0.0.1', port: 65537}])
        proxy_data_selector.filter(e)
        await e;

        proxy_data_selector = new ProxyDataSelectorFilterTest(storage, (w: IProxyData[]) => {
            expect(w).to.deep.eq([{ip: '127.0.1.1', port: 65530}])
        })

        e = new ProxyDataFetchedEvent([
            {ip: '127.0.0.1', port: 65537},
            {ip: '127.0.1.1', port: 65530},
            {ip: '999.999.999.999', port: 3128}
        ])
        proxy_data_selector.filter(e)
        await e;

        await storage.shutdown()
    }

}