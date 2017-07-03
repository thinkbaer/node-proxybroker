import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import {Storage} from "../../src/storage/Storage";
import {Variable} from "../../src/storage/entity/Variable";


import {ProtocolType} from "../../src/lib/ProtocolType";
import {IpAddrState} from "../../src/storage/entity/IpAddrState";
import {IpAddr} from "../../src/storage/entity/IpAddr";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";

let storage: Storage = null

@suite('storage/entity/*')
class EntitiesTest {


    static async before() {
        storage = await Storage.$(<SqliteConnectionOptions>{
            name: 'entity_test',
            type: 'sqlite',
            database: ':memory:'

        })
    }

    static async after() {
        await storage.shutdown()
        storage = Storage['$$'] = null
    }


    @test
    async 'entity: IpAddr'() {
        let e = new IpAddr()
        e.ip = '127.0.0.1'
        e.port = 12345

        expect(e.blocked).to.be.false
        expect(e.to_delete).to.be.false

        let c = await storage.connect()
        let ne = await c.persist(e)

        await c.close()
        expect(ne).to.deep.eq(e)

        c = await storage.connect()
        ne = await c.manager.findOneById(IpAddr, ne.id)
        await c.close()
        e.flattenDates()
        expect(ne).to.deep.eq(e)

        e = new IpAddr()
        e.ip = '127.0.0.2'
        e.port = 12345

        expect(e.supportsHttp()).to.be.false
        expect(e.supportsHttps()).to.be.false
        expect(e.supportsBoth()).to.be.false

        e.addProtocol(ProtocolType.HTTP)
        expect(e.supportsHttp()).to.be.true
        expect(e.supportsHttps()).to.be.false
        expect(e.supportsBoth()).to.be.false

        e.addProtocol(ProtocolType.HTTPS)
        expect(e.supportsHttp()).to.be.true
        expect(e.supportsHttps()).to.be.true
        expect(e.supportsBoth()).to.be.true

        e.removeProtocol(ProtocolType.HTTP)
        expect(e.supportsHttp()).to.be.false
        expect(e.supportsHttps()).to.be.true
        expect(e.supportsBoth()).to.be.false

        e.removeProtocol(ProtocolType.HTTPS)
        expect(e.supportsHttp()).to.be.false
        expect(e.supportsHttps()).to.be.false
        expect(e.supportsBoth()).to.be.false
    }


    @test
    async 'entity: IpAddrStatus'() {
        let e = new IpAddrState()

        //expect( e ).to.be.false
        //expect( e.to_delete ).to.be.false
    }


    @test
    async 'entity: Variable'() {
        let e = new Variable()
        e.key = 'test'
        e.value = 'data'

        let c = await storage.connect()
        let ne = await c.persist(e)
        await c.close()
        expect(ne).to.deep.eq(e)

        c = await storage.connect()
        ne = await c.connection.manager.findOneById(Variable, 'test')
        await c.close()
        expect(ne).to.deep.eq(e)

    }
}

