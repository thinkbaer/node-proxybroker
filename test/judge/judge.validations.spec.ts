// Reference mocha-typescript's global definitions:
/// <reference path="../../node_modules/mocha-typescript/globals.d.ts" />

import * as net from 'net'
import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {Judge} from "../../src/judge/Judge";
import {ProxyServer} from "../../src/server/ProxyServer";
import {Log} from "../../src/lib/logging/Log";
import {RequestResponseMonitor} from "../../src/judge/RequestResponseMonitor";
import {JudgeResults} from "../../src/judge/JudgeResults";
import {IProxyServerOptions} from "../../src/server/IProxyServerOptions";
import {NestedException} from "../../src/exceptions/NestedException";
import {ProtocolType} from "../../src/lib/ProtocolType";

describe('', () => {
});

const SSL_PATH = '../_files/ssl';
const JUDGE_LOCAL_HOST: string = 'judge.local';
const PROXY_LOCAL_HOST: string = 'proxy.local';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

@suite("judge/Judge - judge over proxy http and https protocol validations") @timeout(10000)
class JV {

    static server_wrapper: net.Server = null;

    static proxy_wrapper_port: number = 3456;

    static http_proxy_port: number = 5008;
    static http_proxy_ip: string = PROXY_LOCAL_HOST;
    static http_proxy_server: ProxyServer = null;

    static https_proxy_port: number = 6009;
    static https_proxy_ip: string = PROXY_LOCAL_HOST;
    static https_proxy_server: ProxyServer = null;

    static http_judge: Judge = null;

    static async before() {

        //Log.options({enable: JV._debug, level:'debug'});
        Log.options({enable: false, level:'debug'});
        let proxy_options: IProxyServerOptions = Object.assign({}, {
            // url: 'http://' + JV.http_proxy_ip + ':' + JV.http_proxy_port,
            protocol: 'http',
            ip: JV.http_proxy_ip,
            port: JV.http_proxy_port,
            level: 3,
            toProxy: false
        });
        JV.http_proxy_server = new ProxyServer(proxy_options);

        let proxy_options2: IProxyServerOptions = Object.assign({}, {
//            url: 'https://' + JV.https_proxy_ip + ':' + JV.https_proxy_port,
            protocol: 'https',
            ip: JV.https_proxy_ip,
            port: JV.https_proxy_port,
            level: 3,
            key_file: __dirname + '/' + SSL_PATH + '/proxy/server-key.pem',
            cert_file: __dirname + '/' + SSL_PATH + '/proxy/server-cert.pem',
            toProxy: false

        });
        JV.https_proxy_server = new ProxyServer(proxy_options2);

        let opts = {
            selftest: false,
            remote_lookup: false,
            remote_ip: JUDGE_LOCAL_HOST,
            ip: JUDGE_LOCAL_HOST,
            http_port:8080,
            https_port:8181,
            //remote_url: 'http://' + JUDGE_LOCAL_HOST + ':8080',
            //judge_url: 'http://' + JUDGE_LOCAL_HOST + ':8080',
            request: {
                socket_timeout: 500,
                local_ip: '127.0.0.1'
            }
        };

        JV.http_judge = new Judge(opts);

        let erg = await JV.http_judge.bootstrap();
        expect(erg).to.equal(true);

        erg = await JV.http_judge.wakeup();
        expect(erg).to.equal(true);

        // Wraps between HTTP and HTTPS proxy
        JV.server_wrapper = net.createServer(function (conn: net.Socket) {
            conn.once('data', function (buf: Buffer) {
                // A TLS handshake record starts with byte 22.
                var address: number = (buf[0] === 22) ? JV.https_proxy_port : JV.http_proxy_port;
                var proxy = net.createConnection(address, PROXY_LOCAL_HOST, function () {
                    proxy.write(buf);
                    conn.pipe(proxy).pipe(conn);
                });
            });
        }).listen(JV.proxy_wrapper_port);

        await JV.http_proxy_server.start();
        await JV.https_proxy_server.start()
    }


    static async after() {
        await JV.http_proxy_server.stop();
        await JV.https_proxy_server.stop();
        await JV.http_judge.pending();
        await new Promise<void>(function (resolve) {
            JV.server_wrapper.close(function () {
                resolve()
            })
        });
        JV.http_proxy_server = null;
        JV.https_proxy_server = null;
        JV.http_judge = null
    }


    @test
    async 'tunnel https through http proxy'() {
        let proxy_url_http = 'http://' + JV.http_proxy_ip + ':' + JV.http_proxy_port;

        let judgeReq = JV.http_judge.createRequest('https', proxy_url_http); //, {local_ip: '127.0.0.1'}
        let rrm = await judgeReq.performRequest();
        let log = rrm.logToString();
        expect(log).to.match(/Judge connected/)
    }


    @test
    async 'tunnel https through http proxy (use handle)'() {
        let judgeReq = await JV.http_judge.handleRequest(JV.http_proxy_ip, JV.http_proxy_port, ProtocolType.HTTP, ProtocolType.HTTPS)
        expect(judgeReq.hasError()).to.be.false
    }


    @test.skip()
    async 'TODO: socket timeout on https judge request'() {
        /*
        StdConsole.$enabled = true
        Log.enable = true
        EventBus.register(new StdConsole())
        */
        let proxy_url_https = 'https://' + JV.http_proxy_ip + ':' + JV.http_proxy_port;
        let judgeReq = JV.http_judge.createRequest(proxy_url_https, '',{
            local_ip: '127.0.0.1',
            socket_timeout: 500,
            connection_timeout: 500
        });
        let rrm: RequestResponseMonitor = await judgeReq.performRequest();
        let err = rrm.lastError();
        expect(err instanceof NestedException).to.be.true;
        //expect(err.code).to.be.eq('SOCKET_TIMEDOUT')
        expect(err.code).to.be.eq('SOCKET_HANGUP')
    }


    @test
    async validateFailedOnHttpAndHttps() {
        let results: JudgeResults = await JV.http_judge.validate(PROXY_LOCAL_HOST, 3130);

        for(let res of results.getVariants()){
            expect(res.hasError()).to.be.true;
        }
    }


    @test
    async validateSuccessOnHttpAndFailedOnHttps() {
        let results: JudgeResults = await JV.http_judge.validate(PROXY_LOCAL_HOST, JV.http_proxy_port);

        let http_http = results.getVariant(ProtocolType.HTTP,ProtocolType.HTTP);
        let http_https = results.getVariant(ProtocolType.HTTP,ProtocolType.HTTPS);
        let https_http = results.getVariant(ProtocolType.HTTPS,ProtocolType.HTTP);
        let https_https = results.getVariant(ProtocolType.HTTPS,ProtocolType.HTTPS);

        expect(http_http.hasError()).to.be.false;
        expect(http_http.level).to.eq(3);
        expect(http_https.hasError()).to.be.false;
        expect(http_https.level).to.eq(1);
        expect(https_http.hasError()).to.be.true;
        expect(https_https.hasError()).to.be.true
    }


    @test
    async validateFailedOnHttpAndSuccessOnHttps() {
        // Log.options({enable:true,level:'debug'})
        let results: JudgeResults = await JV.http_judge.validate(PROXY_LOCAL_HOST, JV.https_proxy_port/*,{http:true,https:true}*/);

        results.getVariants()

        let http_http = results.getVariant(ProtocolType.HTTP,ProtocolType.HTTP);
        let http_https = results.getVariant(ProtocolType.HTTP,ProtocolType.HTTPS);
        let https_http = results.getVariant(ProtocolType.HTTPS,ProtocolType.HTTP);
        let https_https = results.getVariant(ProtocolType.HTTPS,ProtocolType.HTTPS);

        expect(http_http.hasError()).to.be.true;
        expect(http_https.hasError()).to.be.true;
        expect(https_http.hasError()).to.be.false;
        expect(https_http.level).to.eq(3);
        expect(https_https.hasError()).to.be.false;
        expect(https_https.level).to.eq(1);
    }


    @test
    async validateSuccessOnHttpAndHttps() {
        let results: JudgeResults = await JV.http_judge.validate(PROXY_LOCAL_HOST, JV.proxy_wrapper_port);
        // console.log(results)

        results.getVariants()
        // console.log(results.variants)

        let http_http = results.getVariant(ProtocolType.HTTP,ProtocolType.HTTP);
        let http_https = results.getVariant(ProtocolType.HTTP,ProtocolType.HTTPS);
        let https_http = results.getVariant(ProtocolType.HTTPS,ProtocolType.HTTP);
        let https_https = results.getVariant(ProtocolType.HTTPS,ProtocolType.HTTPS);

        expect(http_http.hasError()).to.be.false;
        expect(http_http.level).to.eq(3);

        expect(http_https.hasError()).to.be.false;
        expect(http_https.level).to.eq(1);

        expect(https_http.hasError()).to.be.false;
        expect(https_http.level).to.eq(3);

        expect(https_https.hasError()).to.be.false;
        expect(https_https.level).to.eq(1);

    }

}