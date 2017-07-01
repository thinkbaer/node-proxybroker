import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import {Storage} from "../../src/storage/Storage";
import {Variable} from "../../src/storage/entity/Variable";
import {createConnection, getConnectionManager} from "typeorm";
import {IpAddr} from "../../src/storage/entity/IpAddr";


let storage:Storage = null

@suite('storage/entity/*')
class EntitiesTest {


    static async before(){
        storage = await Storage.$({
            name:'entity_test',
            driver:{
                type:'sqlite',
                storage:':memory:'
            }
        })
    }

    static async after(){
        await storage.shutdown()
        storage = Storage['$$'] = null
    }


    @test
    async 'entity: IpAddr'(){
        let e = new IpAddr()

        e.ip = '127.0.0.1'
        e.port = 12345
        e.preUpdate()
        expect(e.blocked).to.be.false
        expect(e.to_delete).to.be.false

        let c = await storage.connect()
        let ne = await c.persist(e)

        await c.close()
        expect(ne).to.deep.eq(e)

        c = await storage.connect()
        ne = await c.connection.entityManager.findOneById(IpAddr, ne.id)
        await c.close()
        expect(ne).to.deep.eq(e)

    }

    @test
    async 'entity: Variable'(){
        let e = new Variable()
        e.key = 'test'
        e.value = 'data'

        let c = await storage.connect()
        let ne = await c.persist(e)
        await c.close()
        expect(ne).to.deep.eq(e)

        c = await storage.connect()
        ne = await c.connection.entityManager.findOneById(Variable, 'test')
        await c.close()
        expect(ne).to.deep.eq(e)

    }
}

