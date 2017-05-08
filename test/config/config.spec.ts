import * as chai from 'chai'
let expect = chai.expect


import {Config} from "../../src/config/Config";
import {DEFAULT_STORAGE_OPTIONS} from "../../src/storage/Storage";
import {IProviderOptions} from "../../src/provider/IProviderOptions";


/**
 * Tests of the configuration reader
 */
describe('Config general', function(){


    /**
     * InMemory configuration
     */
    it('InMemory configuration', async function () {
        let config = new Config()
        await config.init({
            workdir: "/tmp",
            storage: DEFAULT_STORAGE_OPTIONS
        })

        expect(config.options.userdir).to.exist
        expect(config.options.appdir).to.exist
        expect(config.options.workdir).to.eq("/tmp")
    })


    /**
     * Load from file
     */
    it('Load from file', async function () {
        // Mock command line arg
        let config = new Config()
        await config.init()
        await config.loadFromFile(__dirname + '/files/config01.json')
        expect(config.options.workdir).to.eq("/tmp")
    })


    /**
     * Load from file handing over by command line args
     */
    it('Load from file handing over by command line args', async function () {
        // Mock command line arg
        process.argv.push('--configfile',__dirname + '/files/config01.json')
        let config = new Config()
        await config.init()
        expect(config.options.workdir).to.eq("/tmp")
    })


    /**
     * Test the parameter for provider options
     */
    it('Test the parameter for provider options', async function () {

        let pOptions : IProviderOptions = {
            paths:['/some/dir','/some/other/dir'],
            enable:true,
            offset:1000
        }

        let config = new Config()
        await config.init({provider:pOptions})
        expect(config.options.provider).to.deep.eq(pOptions)
    })

})