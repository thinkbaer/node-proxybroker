/*
 import * as assert from 'assert'

import {ProviderManager} from "../../src/lib/provider_manager";
import {ProviderSpec} from "../../src/lib/provider_spec";
import {ProxyType} from "../../src/lib/proxy_types";

describe('Zombie provider: freeproxylists.com definition tests', () => {


    it('ablauf', function (done) {
        console.log('start')

        let providerSpec = ProviderSpec.create('freeproxylists.com (anon)', ProxyType.HTTP_ANON)
        let pageInit = providerSpec.visit('http://www.freeproxylists.com/anonymous.html')

        let runnable = Provider.build(providerSpec)

        runnable.run().then(()=> {
            console.log('done')
            done()
        })

         pageInit.validate('a[href=/^anon\/d.* /]')
         pageInit.follow(($, next) => {
         $('a[href=/^anon\/d.* /]')

         })


         Provider.run(providerSpec)




    })


})
         */
