import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'


import {Config} from "commons-config";
import {DEFAULT_STORAGE_OPTIONS} from "../../src/storage/Storage";

import {K_WORKDIR} from "../../src/types";
import {IProviderOptions} from "../../src/provider/IProviderOptions";


/**
 * TODO
 */
@suite('commons-config integration tests')
class ConfigTests {


    @test
    'In-memory configuration'() {
        Config['$self'] = null
        Config.options()
        Config.jar().merge({
            workdir: "/tmp",
            storage: DEFAULT_STORAGE_OPTIONS
        })

        // console.log(inspect(Config.jarsData))
        expect(Config.get(K_WORKDIR)).to.exist
        expect(Config.get('storage')).to.exist
        expect(Config.get(K_WORKDIR)).to.eq("/tmp")

    }


    /**
     * Load from file
     */
    @test
    'Load from file'() {
        // Mock command line arg
        Config['$self'] = null
        Config.options({
            configs: [{
                type: 'file',
                file: {
                    dirname: __dirname + '/files',
                    filename: 'config01'
                }
            }]
        })
        expect(Config.get(K_WORKDIR)).to.eq("/tmp")
    }

    /**
     * Load from file handing over by command line args
     */
    @test
    'Load from file handing over by command line args'() {
        // Mock command line arg
        process.argv.push('--configfile', __dirname + '/files/config01.json')
        Config['$self'] = null
        Config.options({
            configs: [{
                type: 'file',
                file: '${argv.configfile}',
            }]
        })
        expect(Config.get(K_WORKDIR)).to.eq("/tmp")
    }


    /**
     * Test the parameter for provider options
     */
    @test
    'Test the parameter for provider options'() {

        let pOptions: IProviderOptions = {
            paths: ['/some/dir', '/some/other/dir'],
            enable: true,
            offset: 1000
        }

        Config['$self'] = null
        Config.options()
        Config.jar().merge({provider: pOptions})
        expect(Config.get('provider')).to.deep.eq(pOptions)
    }


}


