import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import {Storage} from "../../src/storage/Storage";
import {IStorageOptions} from "../../src/storage/IStorageOptions";
import {IpAddr} from "../../src/storage/entity/IpAddr";


const DEFAULT_STORAGE_OPTIONS: IStorageOptions = {
    driver: {
        type: "sqlite",
        storage: ":memory:"
    },
    entities: [],
    migrations: [],
    autoSchemaSync: true,
}


@suite('storage/Storage')
class StorageTest {

    @test
    async 'init'() {
        let storage = new Storage();
        await storage.init();
        let entityNames: Array<string> = []
        let cw = await storage.connect()
        cw.connection.entityMetadatas.forEach(entityMeta => {
            entityNames.push(entityMeta.targetName)
        })
        entityNames = entityNames.sort()
        expect(entityNames).to.be.deep.eq(["IpAddr", "Variable"])

        expect(storage.size()).to.be.eq(1)
        await storage.shutdown()
        expect(storage.size()).to.be.eq(0)
    }

    /**
     * sqlite in-memory test
     *
     * @returns {Promise<void>}
     */
    @test
    async 'static'() {
        Storage['$$'] = null
        let storage = await Storage.$();
        expect(storage.size()).to.be.eq(1)

        Storage['$$'] = null
        await storage.shutdown()
    }

}
