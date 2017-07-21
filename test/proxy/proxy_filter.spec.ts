import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {Storage} from "../../src/storage/Storage";
import {ProxyFilter} from "../../src/proxy/ProxyFilter";
import {ProxyDataFetchedEvent} from "../../src/proxy/ProxyDataFetchedEvent";
import {IpAddr} from "../../src/model/IpAddr";
import subscribe from "../../src/events/decorator/subscribe";
import {ProxyDataValidateEvent} from "../../src/proxy/ProxyDataValidateEvent";
import {EventBus} from "../../src/events/EventBus";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Utils} from "../../src/utils/Utils";
import {ProxyDataFetched} from "../../src/proxy/ProxyDataFetched";
import {Log} from "../../src/lib/logging/Log";
describe('', () => {
});

let storage:Storage = null

@suite('proxy/ProxyFilter')
class ProxyDataSelectorTest {

    static before(){
        Log.options({enable:false})
    }

    async before(){
        storage = await Storage.$(<SqliteConnectionOptions>{
            name: 'proxy_data_validator',
            type: 'sqlite',
            database: ':memory:'

        });
        await storage.prepare()
    }

    async after(){
        await storage.shutdown();
    }

    @test
    async 'init'() {
        let proxy_data_selector = new ProxyFilter(storage);
        expect(proxy_data_selector).to.exist;
    }


    @test
    async 'verify if validation is necessary'() {

        let proxy_data_selector = new ProxyFilter(storage);
        let c = await storage.connect();

        let p = new IpAddr();
        p.ip = '192.0.0.1';
        p.port = 3129;
        p.last_checked_at = Utils.now();
        await c.save(p);

        let events = await proxy_data_selector.do(new ProxyDataFetched([
            {ip: '192.0.0.1', port: 3129},
            {ip: '127.0.1.1', port: 3128}
        ]));

        expect(events.length).to.be.eq(1);
        expect(events[0].fired).to.be.true;
        expect(events[0].data.results).to.be.null;
        expect(events[0].data.ip).to.eq('127.0.1.1');
        expect(events[0].data.port).to.eq(3128);
        expect(events[0].jobState).to.contain({
            count: 0,
            selected: 0,
            added: 1,
            skipped: 1,
            blocked: 0,
            updated: 0,
            validated: 0,
            broken: 0
        });


        p.last_checked_at = new Date((new Date()).getTime() - 36 * 60 * 60 * 1000);
        await c.save(p);

        events = await proxy_data_selector.do(new ProxyDataFetched([
            {ip: '192.0.0.1', port: 3129},
            {ip: '127.0.0.1', port: 3128}
        ]));
        expect(events.length).to.be.eq(2);

        expect(events[1].data).to.include({
            results: null,
            ip: '127.0.0.1',
            port: 3128
        });

        // Test subscribe if the events are fired
        class X01 {
            _test: Function = null;

            constructor(test: Function) {
                this._test = test;
            }

            @subscribe(ProxyDataValidateEvent)
            test(p: ProxyDataValidateEvent) {
                this._test(p);
            }
        }

        let _q:ProxyDataValidateEvent[] = [];
        let x01 = new X01(function (e: ProxyDataValidateEvent) {
            _q.push(e);
        });

        EventBus.register(x01);
        await proxy_data_selector.do(new ProxyDataFetched([{ip: '192.0.0.1', port: 3129}]));
        EventBus.unregister(x01);

/*
        expect(_q[0].record).to.deep.include({
            id: 1,
            ip: '192.0.0.1',
            port: 3129,
            blocked: false
        });
*/

        // Test blocked or to_delete flags
        p = new IpAddr();
        p.ip = '192.0.0.2';
        p.port = 3129;
        p.blocked = true;
        await c.save(p);

        p = new IpAddr();
        p.ip = '192.0.0.3';
        p.port = 3129;
        p.to_delete = true;
        await c.save(p);

        events = await proxy_data_selector.do(new ProxyDataFetched([{ip: '192.0.0.2', port: 3129}, {
            ip: '192.0.0.3',
            port: 3129
        }]));
        expect(events.length).to.eq(0);

    }


    @test
    async 'filter'() {
        let addr = {ip: '127.0.0.1', port: 3128};
        class ProxyDataSelectorFilterTest extends ProxyFilter {
            test: Function;

            constructor(storage: Storage, cb: Function) {
                super(storage);
                this.test = cb
            }

            async do(workLoad: ProxyDataFetched): Promise<any> {
                this.test(workLoad)
            }
        }


        let _q:ProxyDataFetched = null;
        let proxy_data_selector = new ProxyDataSelectorFilterTest(storage, (w: ProxyDataFetched) => {
            _q = w;
        });

        let e = new ProxyDataFetchedEvent(addr);
        await proxy_data_selector.filter(e);
        expect(_q.list).to.deep.eq([addr]);

        e = new ProxyDataFetchedEvent([addr]);
        await proxy_data_selector.filter(e);
        expect(_q.list).to.deep.eq([addr]);

        let _r = false;
        proxy_data_selector = new ProxyDataSelectorFilterTest(storage, (w: ProxyDataFetched) => {
            _r = true;
        });

        // should be ignored
        e = new ProxyDataFetchedEvent([{ip: '999.999.999.999', port: 3128}]);
        await proxy_data_selector.filter(e);
        expect(_r).to.be.false;

        // should be ignored
        e = new ProxyDataFetchedEvent([{ip: '127.0.0.1', port: 65537}]);
        await proxy_data_selector.filter(e);
        expect(_r).to.be.false;


        proxy_data_selector = new ProxyDataSelectorFilterTest(storage, (w: ProxyDataFetched) => {
            _q = w;
        });

        e = new ProxyDataFetchedEvent([
            {ip: '127.0.0.1', port: 65537},
            {ip: '127.0.1.1', port: 65530},
            {ip: '999.999.999.999', port: 3128}
        ]);
        await proxy_data_selector.filter(e);
        expect(_q.list).to.deep.eq([{ip: '127.0.1.1', port: 65530}]);

    }

}