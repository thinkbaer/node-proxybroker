import * as mocha from 'mocha';

import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {Log} from "@typexs/base";


let stdMocks = require('std-mocks');

/**
 * TODO
 */
@suite('libs/logging/Log')
class LogTests {

    before(){
        // reset log
        Log.reset();
    }

    @test.skip()
    'handle error output'(){
        Log.options({enable: true})

        Log.error('HalloError', new Error('Sorry'))



    }

    @test
    'check default options'() {

        let opts = Log.options({enable: true, level:'warn'})
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

    @test
    'handling output of multiple values'() {
        Log.options({enable: true, level:'debug'})
        stdMocks.use();
        Log.info('String',1,{test:1})
        Log.warn(new Error('SOME ERROR'),'After Error')
        Log.error(new Error('SOME ERROR'))
        stdMocks.restore();
        let output = stdMocks.flush();
        expect(output.stdout).has.length(2)
        expect(output.stdout[0]).to.include('String\n1\n{\n  "test": 1\n}')
        expect(output.stderr).has.length(1)
        expect(output.stderr[0]).to.include('Error: SOME ERROR\n    at LogTests.handling output of multiple values')

    }

}


