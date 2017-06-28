import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'
import {Storage} from "../../src/storage/Storage";
import {ProxyDataSelector} from "../../src/proxy/ProxyDataSelector";
import {ProxyDataFetchedEvent} from "../../src/provider/ProxyDataDeliveryEvent";
import {IProxyData} from "../../src/proxy/IProxyData";
import {IpAddr} from "../../src/storage/entity/IpAddr";

@suite('proxy/ProxyDataSelector')
class ProxyDataSelectorTest {


    @test
    async 'init'() {
        let storage = await Storage.$({
            name: 'proxy_data_validator',
            driver: {
                type: 'sqlite',
                storage: ':memory:'
            }
        })
        let proxy_data_selector = new ProxyDataSelector(storage)
        expect(proxy_data_selector).to.exist
        await storage.shutdown()
    }


    @test
    async 'do'() {
        let storage = await Storage.$({
            name: 'proxy_data_validator',
            driver: {
                type: 'sqlite',
                storage: ':memory:'
            }
        })
        let proxy_data_selector = new ProxyDataSelector(storage)

        let c = await storage.connect()
        let p = new IpAddr()
        p.ip = '192.0.0.1'
        p.port = 3129
        p.preUpdate()
        await c.persist(p)

        proxy_data_selector.do([{ip:'192.0.0.1',port:3129},{ip:'127.0.1.1',port:3128}])

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

        let storage = await Storage.$({
            name: 'proxy_data_validator',
            driver: {
                type: 'sqlite',
                storage: ':memory:'
            }
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