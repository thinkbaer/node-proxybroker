import * as chai from 'chai'
let expect = chai.expect

import {Config} from "../../src/config/Config";
import {ProviderManager} from "../../src/provider/ProviderManager";
import {IProviderOptions} from "../../src/provider/IProviderOptions";

describe('ProviderManager',() => {

    let options : IProviderOptions = {
        enable:true,
        paths:[__dirname + '/predefined_01/*']
    }

    it('init with directory containing provider classes', async () => {

        let pm = new ProviderManager(options)
        await pm.init()
        expect(pm.providers.length).to.eq(4)

        let providers = pm.findAll()
        expect(providers.length).to.eq(4)

        providers = pm.findAll({name:'mockproxy02'})
        expect(providers.length).to.eq(1)
        expect(providers[0].type).to.eq('http')
        expect(providers[0].url).to.eq('http://localhost:8000/tada02')

        providers = pm.findAll({type:'https'})
        expect(providers.length).to.eq(2)
        providers.forEach(_x => {
            expect(_x.type).to.eq('https')
        })

        providers = pm.findAll({type:'https',name:'mockproxy03'})
        expect(providers.length).to.eq(1)
        expect(providers[0].name).to.eq('mockproxy03')

    })

    it('find explicit provider and instance a worker', async () => {
        let pm = new ProviderManager(options)
        await pm.init()

        let providers = pm.findAll({name:'mockproxy02'})
        expect(providers.length).to.eq(1)

        let provider = providers.shift()
        let worker = await pm.createWorker(provider)
        expect(worker['id']).to.eq('Z1bBgeW')





    })


})