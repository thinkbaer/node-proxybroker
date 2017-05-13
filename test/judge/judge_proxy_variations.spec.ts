// process.env.NODE_DEBUG = 'request|tunnel'
// process.env.NODE_DEBUG = ' request tunnel node '
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


import * as http from 'http'
import * as https from 'https'
import {Judge} from "../../src/judge/Judge";

import * as chai from 'chai'
let expect = chai.expect



import {Log} from "../../src/logging/logging";
import {ProxyServer} from "../../src/server/ProxyServer";

// https://www.proxynova.com/proxy-articles/proxy-anonymity-levels-explained


const JUDGE_LOCAL_HOST: string = 'judge.local'
const PROXY_LOCAL_HOST: string = 'proxy.local'

/**
 * Test different variations of judge and proxy connections for different transparency levels
 *
 * judge <=> proxy
 * http - http
 * http - https
 * https - http
 * https - https
 *
 * Level description
 * + L1 - Elite Proxies (High Anonymity Proxies)
 * + L2 - Anonymous Proxies
 * + L3 - Transparent Proxies
 */

describe('Judge proxy variations tests', () => {

    let debug = false

    let variations = [
        {
            title: 'HTTP Client <-> HTTP Proxy L3 <-> HTTP Judge',
            proxy_options: {level: 3},
            debug: debug,
            judge_secured: false,
            judge_options: {}
        }
        ,
        {
            title: 'HTTP Client <-> HTTP Proxy L2 <-> HTTP Judge',
            proxy_options: {level: 2},
            debug: debug,
            judge_secured: false,
            judge_options: {}

        }
        ,
        {
            title: 'HTTP Client <-> HTTP Proxy L1 <-> HTTP Judge',
            proxy_options: {level: 1},
            judge_secured: false,
            debug: debug,
            judge_options: {}
        }
        ,
        {
            title: 'HTTP Client <-> HTTP Proxy L1 <-> HTTPS Judge (only L1)',
            proxy_options: {level: 1},
            debug: debug,
            judge_secured: true,
            judge_options: {
                key_file: __dirname + '/../ssl/judge/server-key.pem',
                cert_file: __dirname + '/../ssl/judge/server-cert.pem',
            }
        }
        // ,
        // {
        //     // HTTP:C -> HTTPS:PSL3 -> HTTP:S
        //     title: 'HTTP L3 transparent proxy',
        //     level: 3,
        //     server: HTTPSProxyServer_L3,
        //     debug: true
        //
        // },

    ]


    variations.forEach((data) => {

        describe(data.title, () => {
            let proxy_port: number = 5008
            let proxy_ip: string = PROXY_LOCAL_HOST

            let judge: Judge = null
            let proxy_server: ProxyServer = null
            let protocol = (data.judge_secured ? 'https' : 'http')

            before(async function () {
                Log.enable = data.debug

                let proxy_options = Object.assign({}, data.proxy_options,{
                    url: 'http://' + proxy_ip + ':' + proxy_port,
                    _debug: data.debug,
                })
                proxy_server = new ProxyServer(proxy_options)

                let opts = {
                    selftest: false,
                    remote_lookup: false,
                    debug: data.debug,
                    remote_url: protocol + '://' + JUDGE_LOCAL_HOST + ':8080',
                    judge_url: protocol + '://' + JUDGE_LOCAL_HOST + ':8080'
                }
                let options = Object.assign(opts, data.judge_options)
                judge = new Judge(options)

                let erg = await judge.bootstrap()
                expect(erg).to.equal(true)

                erg = await judge.wakeup()
                expect(erg).to.equal(true)

                await proxy_server.start()
            })

            after(async function () {
                await proxy_server.stop()
                await judge.pending()
                Log.enable = true
                proxy_server = null
                judge = null
            })


            it('http request', async function () {

                let proxy_url = proxy_server.url()
                console.log('PROXY=' + proxy_url + ' TO ' + judge.remote_url_f)
                let judgeReq = judge.createRequest(proxy_url, {local_ip: '127.0.0.1'})
                judgeReq._debug = data.debug

                try {
                    let rrm = await judgeReq.performRequest()
                    let log = rrm.logToString()

                    if (judgeReq._debug) {
                        console.log('-------->')
                        console.log(log)
                        console.log('<--------')
                    }

                    expect(judgeReq.level).to.be.equal(data.proxy_options.level)
                    expect(log).to.match(/Judge connected/)
                    expect(log).to.match(new RegExp('Proxy is L' + data.proxy_options.level))
                } catch (err) {
                    console.error(err)
                    throw err
                }

            })
        })


    })

})

process.on('uncaughtException', function (err: Error) {
    console.log(err);
});