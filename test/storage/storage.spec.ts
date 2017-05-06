
import * as chai from 'chai'
let expect = chai.expect

import {Storage} from "../../src/storage/Storage";
import {StorageOptions} from "../../src/storage/StorageOptions";
import {IpAddr} from "../../src/entity/IpAddr";
import {Config} from "../../src/config/Config";

const DEFAULT_STORAGE_OPTIONS : StorageOptions = {
    driver: {
        type: "sqlite",
        storage: ":memory:"
    },
    entities: [],
    migrations: [],
    autoSchemaSync: true,
}



describe('Storage', () => {

    it('init',async () => {

        let storage = new Storage(new Config())
        await storage.init()
        let entityNames:Array<string> = []
        storage.connection.entityMetadatas.forEach(entityMeta => { entityNames.push(entityMeta.targetName) })
        console.log(entityNames)

        entityNames = entityNames.sort()
        expect(entityNames).to.be.deep.eq([ "IpAddr" , "Variable" ])


        // let ipAddr = storage.create(IpAddr)
    })


})
