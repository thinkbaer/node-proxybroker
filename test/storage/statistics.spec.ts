import * as fs from 'fs';

import {suite, test} from "mocha-typescript";

import {Storage} from "../../src/storage/Storage";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Statistics} from "../../src/storage/Statistics";
import {Log} from "../../src/lib/logging/Log";

describe('', () => {
});


let storage: Storage = null;
let dbFile = __dirname + '/../_files/test_database.db'

@suite('storage/Statistics')
class EntitiesTest {

    static async before() {
        Log.options({enable:false})
        storage = new Storage(<SqliteConnectionOptions>{
            name: 'stats_test',
            type: 'sqlite',
            database: dbFile
        })
        await storage.prepare()


    }

    static async after() {
        fs.unlinkSync(dbFile)
        await storage.shutdown();
    }

    @test.skip()
    async 'build'(){
        let s = new Statistics(storage);

        await s.stats();


    }

}

