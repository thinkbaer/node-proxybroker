import {suite, test} from "mocha-typescript";

import {Storage} from "../../src/storage/Storage";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Job} from "../../src/model/Job";
import {Statistics} from "../../src/storage/Statistics";

describe('', () => {
});


let storage: Storage = null;

@suite('storage/Statistics')
class EntitiesTest {

    static async before() {
        storage = new Storage(<SqliteConnectionOptions>{
            name: 'stats_test',
            type: 'sqlite',
            database: __dirname + '/../../docker/local/database.db'
        })
        await storage.prepare()
    }

    static async after() {
        await storage.shutdown();
    }

    @test
    async 'build'(){
        let s = new Statistics(storage);

        await s.stats();


    }

}

