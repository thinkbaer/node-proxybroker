import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import {ProviderManager} from "../../src/provider/ProviderManager";
import {IProviderOptions} from "../../src/provider/IProviderOptions";


@suite('provider/ProviderManager')
class ProviderManagerTest {

    options: IProviderOptions = {
        //enable: true,
        providers: [__dirname + '/predefined_01/*']
    }

    @test
    async 'init with directory containing provider classes'() {

        let pm = new ProviderManager(this.options, true)
        await pm.init()
        expect(pm.providers.length).to.eq(4)
        let providers = pm.findAll()
        expect(providers.length).to.eq(4)
        providers = pm.findAll({name: 'mockproxy02'})
        expect(providers.length).to.eq(1)
        expect(providers[0].type).to.eq('http')
        expect(providers[0].url).to.eq('http://localhost:8000/tada02')

        providers = pm.findAll({type: 'https'})
        expect(providers.length).to.eq(2)
        providers.forEach(_x => {
            expect(_x.type).to.eq('https')
        })

        providers = pm.findAll({type: 'https', name: 'mockproxy03'})
        expect(providers.length).to.eq(1)
        expect(providers[0].name).to.eq('mockproxy03')

    }
    @test
    async 'find explicit provider and instance a worker'() {
        let pm = new ProviderManager(this.options)
        await pm.init()

        let providers = pm.findAll({name: 'mockproxy02'})
        expect(providers.length).to.eq(1)

        let provider = providers.shift()
        let worker = await pm.createWorker(provider)
        expect(worker['id']).to.eq('Z1bBgeW')
    }


}