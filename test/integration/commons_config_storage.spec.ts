import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'



import {Config} from "commons-config";
import {DEFAULT_STORAGE_OPTIONS, Storage} from "../../src/libs/generic/storage/Storage";
import {IStorageOptions} from "../../src/libs/generic/storage/IStorageOptions";

import * as fs from 'fs';
import {PlatformUtils} from "../../src/libs/generic/utils/PlatformUtils";
import {InternStorage} from "../../src/libs/specific/storage/InternStorage";
/**
 * TODO
 */
@suite('commons-config integration tests')
class ConfigTests {

    /**
     * Single file configuration
     */
    @test
    'Load configuration for sqlite in memory' () {
        Config['$self'] = null;
        Config.options({configs:[{type:'file',file:__dirname + '/files/config02.json'}]});

        let storageOptions = Config.get('storage');
        expect(storageOptions).not.to.be.null;
        let storage = new InternStorage(storageOptions);
        let options : IStorageOptions = storage['options'];
        expect(options.type).to.eq("sqlite")
    }

    @test
    async 'Load configuration for sqlite in file'() {
        Config['$self'] = null;
        Config.options({configs:[{type:'file',file:__dirname + '/files/config03.json'}]});
        Config.jar().merge({workdir:__dirname});

        expect(Config.get('workdir')).to.eq( __dirname );
        let storageOptions = Config.get('storage');
        expect(storageOptions).not.to.be.null;
        let storage = new InternStorage(storageOptions);

        let options : IStorageOptions = storage['options'];
        expect(options.type).to.eq("sqlite");

        await storage.prepare();
        expect(PlatformUtils.fileExist(__dirname + '/temp/test03.db')).to.be.true;
        fs.unlinkSync(__dirname + '/temp/test03.db')
    }

}