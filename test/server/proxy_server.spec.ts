import {suite, test} from "mocha-typescript";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Storage} from "../../src/storage/Storage";
import {ProxyServer} from "../../src/server/ProxyServer";
import * as request from "request-promise-native";
import {Log} from "../../src/lib/logging/Log";
import {expect} from "chai";

describe('', () => {
});

@suite('server/ProxyServer')
class ProxyRotatorTest {

    @test
    async 'redirect'() {
        //Log.options({enable: true, level: 'debug'})

        let storage = new Storage(<SqliteConnectionOptions>{
            name: 'proxy_server',
            type: 'sqlite',
            database: ':memory:'
        });
        await storage.init();

        let server_dest = new ProxyServer({
            url: 'http://localhost:3128',
            level: 3,
            toProxy: false
        });
        await server_dest.start();

        let server_distrib = new ProxyServer({
            url: 'http://localhost:3180',
            level: 3,
            toProxy: true,
            target: (header?: any) => {
                Log.debug('headers: ', header);
                return Promise.resolve({host: 'localhost', port: 3128, protocol: 'http'})
            }
        });
        await server_distrib.start();

        let opts: request.RequestPromiseOptions = {
            resolveWithFullResponse: true,
            proxy: 'http://localhost:3180',
            headers: {
                'Proxy-Select-Level': 1
            }

        };



        opts['proxyHeaderExclusiveList'] = [
            'proxy-select-level',
            'proxy-select-speed-limit',
            'proxy-select-ssl',
            'proxy-select-country',
            'proxy-select-fallback'
        ];

        // Http request
        let resp1 = await request.get('http://httpbin.org/headers', opts);
        // console.log(resp1.body);

        // Https request with tunneling
        let resp2 = await request.get('https://httpbin.org/headers', opts);
        // console.log(resp2.body);


        await server_distrib.stop();
        await server_dest.stop();
        expect(JSON.parse(resp1.body).headers).to.contain({
            "Host": "httpbin.org"
        });
        expect(JSON.parse(resp2.body).headers).to.contain({
            "Host": "httpbin.org"
        });
    }
}


