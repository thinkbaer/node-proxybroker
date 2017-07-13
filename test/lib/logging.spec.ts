import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {Log} from "../../src/lib/logging/Log";


let stdMocks = require('std-mocks');

/**
 * TODO
 */
@suite('lib/logging/Log')
class LogTests {

    before(){
        // reset log
        Log['self'] = null
    }

    @test.skip()
    'handle error output'(){
        Log.options({enable: true})

        Log.error('HalloError', new Error('Sorry'))



    }

    @test
    'check default options'() {

        let opts = Log.options({enable: true})
        expect(opts).to.deep.include({
            enable: true,
            events: true,
            level: 'warn'
        })

        expect(opts.transports).to.have.length(1)
        expect(opts.transports[0]).to.have.key('console')
        expect(opts.transports[0].console).to.deep.include({
            json: false,
            name: "console",
            timestamp: true
        })

        stdMocks.use();
        Log.log('INFO', 'HalloLog')
        Log.debug('HalloDebug')
        Log.info('HalloInfo')
        Log.warn('HalloWarn')
        Log.error('HalloError')
        stdMocks.restore();

        let output = stdMocks.flush();

        expect(output).to.contain.keys('stdout','stderr')
        expect(output.stdout).has.length(1)
        expect(output.stderr).has.length(1)
        expect(output.stdout[0]).to.include('HalloWarn')
        expect(output.stderr[0]).to.include('HalloError')
    }



}


