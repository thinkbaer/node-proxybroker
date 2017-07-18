import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Storage} from "../../src/storage/Storage";
import {IpAddr} from "../../src/model/IpAddr";
import {IpAddrState} from "../../src/model/IpAddrState";
import {ProtocolType} from "../../src/lib/ProtocolType";
import {ProxyRotator} from "../../src/proxy/ProxyRotator";
import {IpRotate} from "../../src/model/IpRotate";
describe('', () => {
});




@suite('proxy/ProxyRotator')
class ProxyRotatorTest {

    @test
    async 'rotate'() {
        let storage = new Storage(<SqliteConnectionOptions>{
            name: 'proxy_rotator',
            type: 'sqlite',
            database: ':memory:'
        })

        await storage.init()

        let c = await storage.connect();

        let ip = new IpAddr();
        ip.ip = '127.0.0.1';
        ip.port = 3128;
        ip.validation_id = 1
        ip = await c.save(ip);

        let ips_http = new IpAddrState();
        ips_http.validation_id = ip.validation_id
        ips_http.protocol = ProtocolType.HTTP
        ips_http.addr_id = ip.id
        ips_http.level = 1
        ips_http.enabled = true
        ips_http.duration = 100

        ips_http = await c.save(ips_http);


        let ips_https = new IpAddrState();
        ips_https.validation_id = ip.validation_id
        ips_https.protocol = ProtocolType.HTTPS
        ips_https.addr_id = ip.id
        ips_https.enabled = false

        ips_https.duration = 5000

        ips_https = await c.save(ips_https);


        await c.close();


        let rotator = new ProxyRotator({},storage)

        let next_addr = await rotator.next();

        expect(next_addr).to.not.be.empty

        //console.log(next_addr)

        c = await storage.connect();
        let list = await c.manager.find(IpRotate);
        //console.log(list)

        await c.close()


    }
}


