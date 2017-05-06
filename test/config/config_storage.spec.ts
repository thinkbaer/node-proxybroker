import * as chai from 'chai'
let expect = chai.expect


import {Config} from "../../src/config/Config";
import {DEFAULT_STORAGE_OPTIONS, Storage} from "../../src/storage/Storage";
import {StorageOptions} from "../../src/storage/StorageOptions";

import * as fs from 'fs';

/**
 * Tests of the configuration reader
 */
describe('Config for storage', function(){

    /**
     * Single file configuration
     */
    it('Load configuration for sqlite in memory', async function () {
        let config = new Config()
        await config.init()
        await config.loadFromFile(__dirname + '/files/config02.json')

        let storage = new Storage(config)
        await storage.init()
        let options : StorageOptions = storage['options']
        expect(options.driver.type).to.eq("sqlite")
    })


    it('Load configuration for sqlite in file', async function () {
        let config = new Config()
        await config.init({workdir: __dirname})
        await config.loadFromFile( __dirname + '/files/config03.json' )
        expect(config.options.workdir).to.eq( __dirname )

        let storage = new Storage(config)
        await storage.init()
        let options : StorageOptions = storage['options']
        expect(options.driver.type).to.eq("sqlite")
        expect(fs.existsSync(__dirname + '/temp/test03.db')).to.be.eq(true)
        fs.unlinkSync(__dirname + '/temp/test03.db')
    })
})