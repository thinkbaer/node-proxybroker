import * as chai from 'chai'
let expect = chai.expect

import {Config} from "../../src/config/Config";
import {ProviderManager} from "../../src/provider/ProviderManager";
import {IProviderOptions} from "../../src/provider/IProviderOptions";

describe('ProviderManager',() => {


    it('init', async () => {
        let options : IProviderOptions = {
            enable:true,
            paths:[__dirname + '/predefined_01/*']
        }

        let pm = new ProviderManager(options)
        await pm.init()
        expect(pm.providers.length).to.eq(3)

        let providers = pm.findAll()
        expect(providers.length).to.eq(3)

        providers = pm.findAll({name:'mockproxy02'})
        expect(providers.length).to.eq(1)
        expect(providers[0].type).to.eq('http')
        expect(providers[0].url).to.eq('http://localhost:8000/tada02')

        providers = pm.findAll({type:'https'})
        expect(providers.length).to.eq(1)
        expect(providers[0].type).to.eq('https')
        expect(providers[0].url).to.eq('http://localhost:8000/tada03')

    })
})