import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Storage} from "../../src/libs/generic/storage/Storage";
import {IpAddr} from "../../src/entities/IpAddr";
import {IpAddrState} from "../../src/entities/IpAddrState";
import {ProtocolType} from "../../src/libs/specific/ProtocolType";
import {ProxyRotator} from "../../src/proxy/ProxyRotator";
import {ProxyUsedEvent} from "../../src/proxy/ProxyUsedEvent";
import {Log} from "../../src/libs/generic/logging/Log";
import {InternStorage} from "../../src/libs/specific/storage/InternStorage";

describe('', () => {
});


let storage: Storage = null

@suite('proxy/ProxyRotator')
class ProxyRotatorTest {


    async before() {
        Log.options({enable:false,level:'debug'})
        storage = new InternStorage(<SqliteConnectionOptions>{
            name: 'proxy_rotator',
            type: 'sqlite',
            database: ':memory:'
        })
        await storage.prepare()

        let c = await storage.connect();

        let ip = new IpAddr();
        ip.ip = '127.0.0.1';
        ip.port = 3128;
        ip.validation_id = 1
        ip = await c.save(ip);

        let ips_http = new IpAddrState();
        ips_http.validation_id = ip.validation_id
        ips_http.protocol_src = ProtocolType.HTTP
        ips_http.protocol_dest = ProtocolType.HTTP
        ips_http.addr_id = ip.id
        ips_http.level = 1
        ips_http.enabled = true
        ips_http.duration = 100
        ips_http = await c.save(ips_http);

        let ips_https = new IpAddrState();
        ips_https.validation_id = ip.validation_id
        ips_https.protocol_src = ProtocolType.HTTP
        ips_https.protocol_dest = ProtocolType.HTTPS
        ips_https.addr_id = ip.id
        ips_https.enabled = false

        ips_https.duration = 5000
        ips_https = await c.save(ips_https);

        await c.close();
    }


    async after() {
        await storage.shutdown()
    }


    @test
    async 'log success'() {

        let e = new ProxyUsedEvent()
        e.statusCode = 201
        e.duration = 1000
        e.success = true
        e.protocol = ProtocolType.HTTP
        e.protocol_dest = ProtocolType.HTTP
        e.start = new Date()
        e.stop = new Date()
        e.hostname = '127.0.0.1'
        e.port = 3128

        let rotator = new ProxyRotator({}, storage)
        let rotate = await rotator.log(e)


        expect(rotate).to.deep.include({
            successes: 1,
            errors: 0,
            duration: 1000,
            duration_average: 1000,
            inc: 0,
            used: 0,
            addr_id: 1,
            protocol_src: 1,
            id: 1,
        })

        expect(rotate['_log']).to.deep.include({
            duration: 1000,
            addr_id: 1,
            protocol: 1,
            error: null,
            statusCode: 201,
            id: 1, success: true,
        })

        //console.log(rotate)
    }

    @test
    async 'log error'() {
        let e = new ProxyUsedEvent()
        e.statusCode = 504
        e.duration = 1000
        e.success = false
        e.protocol = ProtocolType.HTTP
        e.protocol_dest = ProtocolType.HTTP
        e.start = new Date()
        e.stop = new Date()
        e.hostname = '127.0.0.1'
        e.port = 3128
        e.error = new Error('Test')

        let rotator = new ProxyRotator({}, storage)
        let rotate = await rotator.log(e)


        expect(rotate).to.deep.include({
            successes: 0,
            errors: 1,
            duration: 0,
            duration_average: 0,
            inc: 0,
            used: 0,
            addr_id: 1,
            protocol_src: 1,
            id: 1,
        })

        expect(rotate['_log']).to.deep.include({
            duration: 1000,
            addr_id: 1,
            protocol: 1,
            statusCode: 504,
            id: 1,
            success: false,
        })


    }

    @test
    async 'rotate'() {


        let rotator = new ProxyRotator({}, storage)
        let next_addr = await rotator.next();
        expect(next_addr).to.not.be.empty

        //console.log(next_addr)

        expect(next_addr).to.deep.include({
            id: 1,
            key: '127.0.0.1:3128',
            ip: '127.0.0.1',
            validation_id: 1,
            protocols_src: 0,
            protocols_dest: 0,
            blocked: false,
            to_delete: false,
            count_errors: 0,
            errors_since_at: null,
            count_success: 0,
            success_since_at: null
        })
    }
}


