import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import {Storage} from "../../src/storage/Storage";

import {IpAddr} from "../../src/storage/entity/IpAddr";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";


const DEFAULT_STORAGE_OPTIONS: SqliteConnectionOptions = {
    type: "sqlite",
    database: ":memory:",

    entities: [],
    migrations: [],
    autoSchemaSync: true,
};


@suite('storage/Storage')
class StorageTest {

    @test
    async 'init'() {
        let storage = new Storage(<SqliteConnectionOptions>{
            name: 'storage_test',
            type: "sqlite",
            database: ":memory:"
        });
        await storage.init();
        let entityNames: Array<string> = [];
        let cw = await storage.connect();
        cw.connection.entityMetadatas.forEach(entityMeta => {
            entityNames.push(entityMeta.targetName)
        });
        entityNames = entityNames.sort();
        expect(entityNames).to.be.deep.eq(["IpAddrState", "IpAddr", "Variable","IpLoc","Job","JobState"].sort());

        expect(storage.size()).to.be.eq(1);
        await storage.shutdown();
        expect(storage.size()).to.be.eq(0)
    }

    /**
     * sqlite in-memory test
     *
     * @returns {Promise<void>}
     */
    @test
    async 'static'() {
        Storage['$$'] = null;
        let storage = await Storage.$(<SqliteConnectionOptions>{
            name: 'storage_test',
            type: "sqlite",
            database: ":memory:"
        });
        expect(storage.size()).to.be.eq(1);

        Storage['$$'] = null;
        await storage.shutdown()
    }

}
