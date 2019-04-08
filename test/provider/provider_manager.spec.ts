import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'
import * as _ from 'lodash'

import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import subscribe from "commons-eventbus/decorator/subscribe";
import {ProxyDataFetchedEvent} from "../../src/libs/proxy/ProxyDataFetchedEvent";
import {IProviderOptions} from "../../src/libs/provider/IProviderOptions";
import {Log} from "@typexs/base";
import {ProviderManager} from "../../src/libs/provider/ProviderManager";
import {ProxyFilter} from "../../src/libs/proxy/ProxyFilter";
import {EventBus} from "commons-eventbus";
import {ProviderRunEvent} from "../../src/libs/provider/ProviderRunEvent";

class X {
    test: Function;

    constructor(t: Function) {
        this.test = t
    }

    @subscribe(ProxyDataFetchedEvent)
    _test(p: ProxyDataFetchedEvent) {
        this.test(p)
    }
}


@suite('provider/ProviderManager')
class ProviderManagerTest {

    options: IProviderOptions = {
        //enable: true,
        providers: [__dirname + '/predefined_01/*'],
        schedule: {enable: false}
    };

    static before(){
        Log.options({enable:false})
    }

    @test
    async 'init with directory containing provider classes'() {

        let pm = new ProviderManager(this.options, null, true);
        await pm.prepare();
        expect(pm.providers.length).to.eq(4);
        let providers = pm.findAll();
        expect(providers.length).to.eq(4);
        providers = pm.findAll({name: 'mockproxy02'});
        expect(providers.length).to.eq(1);
        expect(providers[0].type).to.eq('http');
        expect(providers[0].url).to.eq('http://localhost:8000/tada02');

        providers = pm.findAll({type: 'https'});
        expect(providers.length).to.eq(2);
        providers.forEach(_x => {
            expect(_x.type).to.eq('https')
        });

        providers = pm.findAll({type: 'https', name: 'mockproxy03'});
        expect(providers.length).to.eq(1);
        expect(providers[0].name).to.eq('mockproxy03')

    }


    @test
    async 'find explicit provider and instance a worker'() {
        let pm = new ProviderManager(this.options);
        await pm.prepare();

        let providers = pm.findAll({name: 'mockproxy02'});
        expect(providers.length).to.eq(1);

        let provider = providers.shift();
        let worker = await pm.createWorker(provider);
        expect(worker['id']).to.eq('2ilQsa')
    }

    @test
    async 'initialize with storage'() {
        let storage = new InternStorage(<SqliteConnectionOptions>{
            name: 'proxy_manager',
            type: 'sqlite',
            database: ':memory:'
        });
        await storage.prepare();

        let pm = new ProviderManager(this.options, storage, true);
        await pm.prepare();
        await pm.shutdown();
        expect(pm.jobs.length).to.eq(4);
        expect(_.some(pm.jobs, {
            name: "mockproxy01",
            type: "anonym",
            enabled: true,
            active: true,
            data: {url: "http://localhost:8000/tada01"}
        })).to.be.true;
        expect(_.some(pm.jobs, {
            name: "mockproxy02",
            type: "http",
            enabled: true,
            active: true,
            data: {url: "http://localhost:8000/tada02"}
        })).to.be.true;
        expect(_.some(pm.jobs, {
            name: "mockproxy03",
            type: "https",
            enabled: true,
            active: true,
            data: {url: "http://localhost:8000/tada03"}
        })).to.be.true;

        let c = await storage.connect();
        let jobs = await c.manager.find(Job);
        expect(jobs.length).to.eq(4);
        expect(_.some(jobs, {
            name: "mockproxy01",
            type: "anonym",
            enabled: true,
            active: true,
            data: {url: "http://localhost:8000/tada01"}
        })).to.be.true;
        expect(_.some(jobs, {
            name: "mockproxy02",
            type: "http",
            enabled: true,
            active: true,
            data: {url: "http://localhost:8000/tada02"}
        })).to.be.true;
        expect(_.some(jobs, {
            name: "mockproxy03",
            type: "https",
            enabled: true,
            active: true,
            data: {url: "http://localhost:8000/tada03"}
        })).to.be.true;

        await c.close();
        await storage.shutdown()
    }


    @test
    async 'run a job'() {
        let storage = new InternStorage(<SqliteConnectionOptions>{
            name: 'proxy_manager',
            type: 'sqlite',
            database: ':memory:'
        });
        await storage.prepare();

        let pm = new ProviderManager(this.options, storage, true);
        let pds = new ProxyFilter(storage);
        EventBus.register(pds);
        await pm.prepare();

        let jobState = await pm.do({name: "mockproxy01", type: "anonym"});
        let jobState2 = _.clone(jobState);
        expect(jobState2.id).to.eq(1);
        expect(jobState2.count).to.eq(2);
        expect(jobState2.selected).to.eq(2);
        expect(jobState2.added).to.eq(0);

        await pds.await();
        expect(jobState.id).to.eq(1);
        expect(jobState.count).to.eq(2);
        expect(jobState.selected).to.eq(2);
        expect(jobState.added).to.eq(2);

        await pm.shutdown();
        await storage.shutdown();
        EventBus.unregister(pds)
    }


    @test
    async 'run by job event'() {
        let storage = new InternStorage(<SqliteConnectionOptions>{
            name: 'proxy_manager',
            type: 'sqlite',
            database: ':memory:'
        });
        await storage.prepare();

        let pm = new ProviderManager(this.options, storage, true);
        EventBus.register(pm);
        await pm.prepare();


        let event = new ProviderRunEvent({name: "mockproxy01", type: "anonym"});
        event.fire();
        await pm.await();

        let c = await storage.connect();
        let jobsStates = await c.manager.find(JobState);

        expect(jobsStates.shift()).to.deep.include({
            count: 2,
            selected: 0,
            id: 1,
            name: 'mockproxy01',
            type: 'anonym'
        });

        await c.close();
        await pm.shutdown();
        await storage.shutdown();
        EventBus.unregister(pm)
    }

    /**
     * Test schedule process
     *
     */
    @test
    async 'schedule'() {
        let now = Date.now();

        let storage = new InternStorage(<SqliteConnectionOptions>{
            name: 'proxy_manager',
            type: 'sqlite',
            database: ':memory:'
        });
        await storage.prepare();
        let sec = new Date(now + 2000);
        let options: IProviderOptions = {
            providers: [__dirname + '/predefined_01/MockedProxies01.*'],
            schedule: {
                enable: true,
                pattern: `${sec.getSeconds()} ${sec.getMinutes()} ${sec.getHours()} * * *`
            },
        };

        let inc = 0;
        let _X = new X((y: ProxyDataFetchedEvent) => {
            inc++;
            expect(y.list).to.deep.include({ip: '127.0.0.1', port: 3128});
            expect(y.list).to.deep.include({ip: '127.0.0.2', port: 3129});
            expect(y.jobState).to.deep.include({count: 2})
        });
        EventBus.register(_X);

        let pm = new ProviderManager(options, storage, true);
        EventBus.register(pm);
        await pm.prepare();

        let offset = pm.next.getTime() - (new Date()).getTime();
        expect(offset).to.be.lessThan(2000);

        await new Promise((resolve) => {
            setTimeout(function () {
                resolve()
            }, 3000)
        });
        offset = pm.next.getTime() - (new Date()).getTime();
        expect(offset).to.be.greaterThan(23 * 60 * 60 * 1000);

        await pm.await();
        await pm.shutdown();
        await storage.shutdown();

        expect(inc).to.be.eq(2);

        EventBus.unregister(_X);
        EventBus.unregister(pm)
    }

}
