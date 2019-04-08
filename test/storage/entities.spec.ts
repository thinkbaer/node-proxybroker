import * as mocha from 'mocha';


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'


import {ProtocolType} from "../../src/libs/specific/ProtocolType";
import {IpAddrState} from "../../src/entities/IpAddrState";
import {IpAddr} from "../../src/entities/IpAddr";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {IpRotate} from "../../src/entities/IpRotate";
import {IpRotateLog} from "../../src/entities/IpRotateLog";
import {IpLoc} from "../../src/entities/IpLoc";

let storage: Storage = null;

@suite('storage/entity/*')
class EntitiesTest {

    static async before() {
        storage = new InternStorage(<SqliteConnectionOptions>{
            name: 'entity_test',
            type: 'sqlite',
            database: ':memory:'
        })
        await storage.prepare()
    }

    static async after() {
        await storage.shutdown();
        storage = Storage['$$'] = null
    }

    @test.skip()
    'TODO: entity: Job'(){
        let e = new Job()
    }

    @test.skip()
    'TODO: entity: JobState'(){
        let e = new JobState()
    }

    @test.skip()
    'TODO: entity: IpLoc'(){
        let e = new IpLoc()
    }

    @test.skip()
    'TODO: entity: IpRotate'(){
        let e = new IpRotate()
    }

    @test.skip()
    'TODO: entity: IpRotateLog'(){
        let e = new IpRotateLog()
    }

    @test.skip()
    async 'TODO: entity: IpAddrStatus'() {
        let e = new IpAddrState()
    }

    @test
    async 'entity: IpAddr'() {
        let e = new IpAddr();
        e.ip = '127.0.0.1';
        e.port = 12345;

        expect( e.blocked  ).to.be.false;
        expect( e.to_delete ).to.be.false;

        let c = await storage.connect();
        let ne = await c.save(e);

        await c.close();
        expect(ne).to.deep.eq(e);

        c = await storage.connect();
        ne = await c.manager.findOneById(IpAddr, ne.id);
        await c.close();
        e.flattenDates();
        expect(ne).to.deep.eq(e);

        e = new IpAddr();
        e.ip = '127.0.0.2';
        e.port = 12345;

        expect(e.supportsHttp()).to.be.false;
        expect(e.supportsHttps()).to.be.false;
        expect(e.supportsBoth()).to.be.false;

        e.addProtocol(ProtocolType.HTTP);
        expect(e.supportsHttp()).to.be.true;
        expect(e.supportsHttps()).to.be.false;
        expect(e.supportsBoth()).to.be.false;

        e.addProtocol(ProtocolType.HTTPS);
        expect(e.supportsHttp()).to.be.true;
        expect(e.supportsHttps()).to.be.true;
        expect(e.supportsBoth()).to.be.true;

        e.removeProtocol(ProtocolType.HTTP);
        expect(e.supportsHttp()).to.be.false;
        expect(e.supportsHttps()).to.be.true;
        expect(e.supportsBoth()).to.be.false;

        e.removeProtocol(ProtocolType.HTTPS);
        expect(e.supportsHttp()).to.be.false;
        expect(e.supportsHttps()).to.be.false;
        expect(e.supportsBoth()).to.be.false
    }




    @test
    async 'entity: Variable'() {
        let e = new Variable();
        e.key = 'test';
        e.value = 'data';

        let c = await storage.connect();
        let ne = await c.save(e);
        await c.close();
        expect(ne).to.deep.eq(e);

        c = await storage.connect();
        ne = await c.connection.manager.findOneById(Variable, 'test');
        await c.close();
        expect(ne).to.deep.eq(e)
    }
}

