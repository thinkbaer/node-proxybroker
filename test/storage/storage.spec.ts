
import * as chai from 'chai'
let expect = chai.expect

import {Storage} from "../../src/storage/Storage";
import {StorageOptions} from "../../src/storage/StorageOptions";

const DEFAULT_STORAGE_OPTIONS : StorageOptions = {
    driver: {
        type: "sqlite",
        storage: ":memory:"
    },
    entities: [
        //__dirname + "../../../src/entity/*.js"
    ],
    migrations: [
        //__dirname + "../../src/migrations/*.js"
    ],
    autoSchemaSync: true,
}



describe('Storage', () => {

    it('init',async () => {
        let storage = new Storage()
        await storage.init()
        let entityNames:Array<string> = []
        storage.connection.entityMetadatas.forEach(entityMeta => { entityNames.push(entityMeta.targetName) })
        console.log(entityNames)

        entityNames = entityNames.sort()
        expect(entityNames).to.be.deep.eq([ "IpAddr" , "Variable" ])
    })

})
