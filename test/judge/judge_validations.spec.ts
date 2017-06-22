// Reference mocha-typescript's global definitions:
/// <reference path="../../node_modules/mocha-typescript/globals.d.ts" />

import * as mocha from 'mocha';
describe('',()=>{})

import * as net from 'net'
import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from "util";
import {Judge} from "../../src/judge/Judge";
import {ProxyServer} from "../../src/server/ProxyServer";
import {Log} from "../../src/logging/Log";
import {RequestResponseMonitor} from "../../src/judge/RequestResponseMonitor";
import {JudgeResults} from "../../src/judge/JudgeResults";
import {IProxyServerOptions} from "../../src/server/IProxyServerOptions";


const JUDGE_LOCAL_HOST: string = 'judge.local'
const PROXY_LOCAL_HOST: string = 'proxy.local'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

@suite("Judge over proxy http and https protocol validations")
class JV {

    static _debug: boolean = false

    static server_wrapper :net.Server = null

    static proxy_wrapper_port: number = 3456

    static http_proxy_port: number = 5008
    static http_proxy_ip: string = PROXY_LOCAL_HOST
    static http_proxy_server: ProxyServer = null

    static https_proxy_port: number = 6009
    static https_proxy_ip: string = PROXY_LOCAL_HOST
    static https_proxy_server: ProxyServer = null

    static http_judge: Judge = null

    static async before() {
        Log.enable = JV._debug
        let proxy_options : IProxyServerOptions = Object.assign({}, {
            url: 'http://' + JV.http_proxy_ip + ':' + JV.http_proxy_port,
            _debug: JV._debug,
            level: 3
        })
        JV.http_proxy_server = new ProxyServer(proxy_options)

        let proxy_options2 : IProxyServerOptions = Object.assign({}, {
            url: 'https://' + JV.https_proxy_ip + ':' + JV.https_proxy_port,
            _debug: JV._debug,
            level: 3,
            key_file: __dirname + '/../ssl/proxy/server-key.pem',
            cert_file: __dirname + '/../ssl/proxy/server-cert.pem',

        })
        JV.https_proxy_server = new ProxyServer(proxy_options2)

        let opts = {
            selftest: false,
            remote_lookup: false,
            debug: JV._debug,
            remote_url: 'http://' + JUDGE_LOCAL_HOST + ':8080',
            judge_url: 'http://' + JUDGE_LOCAL_HOST + ':8080',
            request:{
                timeout:500,
                local_ip:'127.0.0.1'
            }
        }

        JV.http_judge = new Judge(opts)

        let erg = await JV.http_judge.bootstrap()
        expect(erg).to.equal(true)

        erg = await JV.http_judge.wakeup()
        expect(erg).to.equal(true)

        // Wraps between HTTP and HTTPS proxy
        JV.server_wrapper = net.createServer(function(conn:net.Socket){
            conn.once('data', function (buf:Buffer) {
                // A TLS handshake record starts with byte 22.
                var address : number = (buf[0] === 22) ? JV.https_proxy_port : JV.http_proxy_port;
                var proxy = net.createConnection(address, PROXY_LOCAL_HOST, function () {
                    proxy.write(buf);
                    conn.pipe(proxy).pipe(conn);
                });
            });
        }).listen(JV.proxy_wrapper_port)

        await JV.http_proxy_server.start()
        await JV.https_proxy_server.start()
    }

    static async after() {
        await JV.http_proxy_server.stop()
        await JV.https_proxy_server.stop()
        await JV.http_judge.pending()
        await new Promise<void>(function (resolve) {
            JV.server_wrapper.close(function(){
                resolve()
            })
        })

        JV.http_proxy_server = null
        JV.https_proxy_server = null
        JV.http_judge = null
    }

    @test
    async proxyIpAndPortForHttp() {

        let proxy_url_http = 'http://' + JV.http_proxy_ip + ':' + JV.http_proxy_port
        //let proxy_url_https = 'https://' + JV.http_proxy_ip + ':' + JV.http_proxy_port

        let judgeReq = JV.http_judge.createRequest(proxy_url_http, {local_ip: '127.0.0.1'})
        judgeReq._debug = JV._debug

        let rrm = await judgeReq.performRequest()
        let log = rrm.logToString()

        if (judgeReq._debug) {
            console.log('-------->')
            console.log(log)
            console.log('<--------')
        }

        expect(log).to.match(/Judge connected/)
    }

    @test
    async proxyIpAndPortForHttpsNegativ() {
        let proxy_url_https = 'https://' + JV.http_proxy_ip + ':' + JV.http_proxy_port
        let judgeReq = JV.http_judge.createRequest(proxy_url_https, {local_ip: '127.0.0.1', timeout: 500})
        judgeReq._debug = JV._debug
        let rrm:RequestResponseMonitor = await judgeReq.performRequest()
        expect(rrm.lastError()).to.deep.eq({"code":"ESOCKETTIMEDOUT","connect":false})
    }


    @test
    async validateFailedOnHttpAndHttps(){
        let results : JudgeResults = await JV.http_judge.validate(PROXY_LOCAL_HOST,3128)
        expect(results.http.error).to.eq(true)
        expect(results.https.error).to.eq(true)
    }

    @test
    async validateSuccessOnHttpAndFailedOnHttps(){
        let results : JudgeResults = await JV.http_judge.validate(PROXY_LOCAL_HOST,JV.http_proxy_port)
        expect(results.http.error).to.eq(false)
        expect(results.http.level).to.eq(3)
        expect(results.https.error).to.eq(true)
    }

    @test
    async validateFailedOnHttpAndSuccessOnHttps(){
        let results : JudgeResults = await JV.http_judge.validate(PROXY_LOCAL_HOST,JV.https_proxy_port)
        expect(results.http.error).to.eq(true)
        expect(results.https.error).to.eq(false)
    }

    @test
    async validateSuccessOnHttpAndHttps(){
        let results : JudgeResults = await JV.http_judge.validate(PROXY_LOCAL_HOST,JV.proxy_wrapper_port)
        // console.log(results)
        expect(results.http.error).to.eq(false)
        expect(results.https.error).to.eq(false)
    }

}