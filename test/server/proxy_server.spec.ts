import {suite, test, timeout} from "mocha-typescript";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {Storage} from "../../src/storage/Storage";
import {ProxyServer} from "../../src/server/ProxyServer";
import * as request from "request-promise-native";
import {Log} from "../../src/lib/logging/Log";
import {expect} from "chai";
import {Utils} from "../../src/utils/Utils";

describe('', () => {
});

let storage :Storage = null;
let server_dest : ProxyServer = null;
let server_distrib: ProxyServer  = null;
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

let http_url = 'http://php.net/support.php'
let http_string = 'A good place to start is by skimming'
let https_url = 'https://nodejs.org/en/about/'
let https_string = 'As an asynchronous event driven JavaScript runtime'

@suite('server/ProxyServer') @timeout(20000)
class ProxyServerTest {


    async  before(){

        server_dest = new ProxyServer({
            url: 'http://localhost:3128',
            level: 3,
            toProxy: false
        });
        await server_dest.start();

        server_distrib = new ProxyServer({
            url: 'http://localhost:3180',
            level: 3,
            toProxy: true,
            target: (header?: any) => {
                Log.debug('headers: ', header);
                return Promise.resolve({host: 'localhost', port: 3128, protocol: 'http'})
            }
        });
        await server_distrib.start();

    }


    async  after(){
        await server_distrib.stop();
        await server_dest.stop();
    }


    @test
    async 'http success'() {
        let resp1 = await request.get(http_url, opts);
        expect(resp1.body).to.contain(http_string);
    }

    @test
    async 'https success'() {
        // Log.options({enable: true, level: 'debug'})
        let resp1 = await request.get(https_url, opts);
        expect(resp1.body).to.contain(https_string);
    }

    @test
    async 'http failing'() {
        // Http request
        let resp1 = null
        try {
            resp1 = await request.get('http://asd-test-site.org/html', opts);

        } catch (err) {
            expect(err).to.exist
            expect(err.statusCode).to.be.eq(400)
            resp1 = err.response
            expect(resp1.body).to.contain('getaddrinfo ENOTFOUND asd-test-site.org asd-test-site.org:80');
        }
    }

    @test
    async 'https failing'() {
        // Log.options({enable:true,level:'debug'})
        // Http request
        let resp1 = null
        try {
            resp1 = await request.get('https://asd-test-site.org/html', opts);
        } catch (err) {
            expect(err).to.exist
            expect(err.message).to.contain('Error: tunneling socket could not be established, statusCode=400');
        }
    }

}


