import * as mocha from 'mocha';


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'


import {Config} from "commons-config";


import {IProviderOptions} from "../../src/libs/provider/IProviderOptions";
import {DEFAULT_STORAGE_OPTIONS} from "@typexs/base";


/**
 * TODO
 */
@suite('commons-config integration tests')
class ConfigTests {


    @test
    'In-memory configuration'() {
        Config['$self'] = null;
        Config.options();
        Config.jar().merge({
            workdir: "/tmp",
            storage: DEFAULT_STORAGE_OPTIONS
        });

        // console.log(inspect(Config.jarsData))
        expect(Config.get(K_WORKDIR)).to.exist;
        expect(Config.get('storage')).to.exist;
        expect(Config.get(K_WORKDIR)).to.eq("/tmp")

    }


    /**
     * Load from file
     */
    @test
    'Load from file'() {
        // Mock command line arg
        Config['$self'] = null;
        Config.options({
            configs: [{
                type: 'file',
                file: {
                    dirname: __dirname + '/files',
                    filename: 'config01'
                }
            }]
        });
        expect(Config.get(K_WORKDIR)).to.eq("/tmp")
    }

    /**
     * Load from file handing over by command line args
     */
    @test
    'Load from file handing over by command line args'() {
        // Mock command line arg
        process.argv.push('--configfile', __dirname + '/files/config01.json');
        Config['$self'] = null;
        Config.options({
            configs: [{
                type: 'file',
                file: '${argv.configfile}',
            }]
        });
        expect(Config.get(K_WORKDIR)).to.eq("/tmp")
    }

    /**
     * Load from file handing over by command line args
     */
    @test
    'Given file doesn\'t exists'() {
        // Mock command line arg
        process.argv.push('--configfile', './files/config_non.json');
        Config['$self'] = null;
        let options = Config.options({
            configs: [
                {
                    type: 'file',
                    file: '${argv.configfile}',
                },
                {
                    type: 'file',
                    file: './some/file/name.json',
                }
            ]
        });

        expect(options.configs).to.deep.include({type: 'file', file: './files/config_non.json', state: false})
        expect(options.configs).to.deep.include({type: 'file', file: './some/file/name.json', state: false})
    }


    /**
     * Test the parameter for provider options
     */
    @test
    'Test the parameter for provider options'() {

        let pOptions: IProviderOptions = {
            providers: ['/some/dir', '/some/other/dir'],
            schedule: {
                enable: true
            }
        };

        Config['$self'] = null;
        Config.options();
        Config.jar().merge({provider: pOptions});
        expect(Config.get('provider')).to.deep.eq(pOptions)
    }


}


