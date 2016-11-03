
import * as assert from 'assert'
import {ProviderManager} from "../../src/lib/provider_manager";

describe('ProviderManager tests', function () {


    /**
     * Scenarios
     * - Provider Implementatations are in a directory
     */

    it('init', function (done) {
        let providerManager = new ProviderManager()
        providerManager.addPathAsync(__dirname + '/../../dist/providers')
            .then(function(added) {
                assert.equal(true,added)
                done()
            })
            .catch(err =>{
                done(err)
            })



    })


})
