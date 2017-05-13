// process.env.NODE_DEBUG = 'request|tunnel'
// process.env.NODE_DEBUG = ' request tunnel node '
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from "util";

import * as http from 'http'
import * as https from 'https'
import {Judge} from "../../src/judge/Judge";
import {Log} from "../../src/logging/logging";
import {ProxyServer} from "../../src/server/ProxyServer";

// https://www.proxynova.com/proxy-articles/proxy-anonymity-levels-explained


const JUDGE_LOCAL_HOST: string = 'judge.local'
const PROXY_LOCAL_HOST: string = 'proxy.local'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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

let debug = false

interface Variation {
    title: string
    proxy_options: {
        level: number
        key_file?:string
        cert_file?:string
    },
    debug: boolean,
    judge_options: {
        key_file?:string
        cert_file?:string
    }


}

suite('Judge proxy variations', () => {
    let variations:Array<Variation> = [
        {
            title: 'Client <-> HTTP Proxy L3 <-> HTTP Judge',
            proxy_options: {level: 3},
            debug: debug,
            judge_options: {}
        }
        ,
        {
            title: 'Client <-> HTTP Proxy L2 <-> HTTP Judge',
            proxy_options: {level: 2},
            debug: debug,
            judge_options: {}

        }
        ,
        {
            title: 'Client <-> HTTP Proxy L1 <-> HTTP Judge',
            proxy_options: {level: 1},
            debug: debug,
            judge_options: {}
        }
        ,
        {
            title: 'Client <-> HTTP Proxy L1 <-> HTTPS Judge (only L1; because proxy by pass tunnel)',
            proxy_options: {level: 1},
            debug: debug,
            judge_options: {
                key_file: __dirname + '/../ssl/judge/server-key.pem',
                cert_file: __dirname + '/../ssl/judge/server-cert.pem',
            }
        }
        ,
        {
            title: 'Client <-> HTTPS Proxy L1 <-> HTTPS Judge (only L1; because proxy by pass tunnel)',
            proxy_options: {
                level: 1,
                key_file: __dirname + '/../ssl/proxy/server-key.pem',
                cert_file: __dirname + '/../ssl/proxy/server-cert.pem',
            },
            debug: debug,
            //debug: true,
            judge_options: {
                key_file: __dirname + '/../ssl/judge/server-key.pem',
                cert_file: __dirname + '/../ssl/judge/server-cert.pem',
            }
        }
        ,
        {
            title: 'Client <-> HTTPS Proxy L3 <-> HTTP Judge',
            proxy_options: {
                level: 3,
                key_file: __dirname + '/../ssl/proxy/server-key.pem',
                cert_file: __dirname + '/../ssl/proxy/server-cert.pem',
            },
            debug: debug,
            judge_options: {}
        }
        ,
        {
            title: 'Client <-> HTTPS Proxy L2 <-> HTTP Judge',
            proxy_options: {
                level: 2,
                key_file: __dirname + '/../ssl/proxy/server-key.pem',
                cert_file: __dirname + '/../ssl/proxy/server-cert.pem',
            },
            debug: debug,
            judge_options: {}
        }
        ,
        {
            title: 'Client <-> HTTPS Proxy L1 <-> HTTP Judge',
            proxy_options: {
                level: 1,
                key_file: __dirname + '/../ssl/proxy/server-key.pem',
                cert_file: __dirname + '/../ssl/proxy/server-cert.pem',
            },
            debug: debug,
            judge_options: {}
        }
    ]

    variations.forEach((data) => {

        @suite(data.title) class Clazz {

            static proxy_port = 5008
            static proxy_ip = PROXY_LOCAL_HOST
            static judge_protocol = (data.judge_options.key_file && data.judge_options.cert_file  ? 'https' : 'http')
            static proxy_protocol = (data.proxy_options.key_file && data.proxy_options.cert_file  ? 'https' : 'http')

            static judge : Judge = null
            static proxy_server : ProxyServer = null

            static async before() {
                Log.enable = data.debug

                let proxy_options = Object.assign({}, data.proxy_options, {
                    url: this.proxy_protocol + '://' + this.proxy_ip + ':' + this.proxy_port,
                    _debug: data.debug,
                })
                this.proxy_server = new ProxyServer(proxy_options)

                let opts = {
                    selftest: false,
                    remote_lookup: false,
                    debug: data.debug,
                    remote_url: this.judge_protocol + '://' + JUDGE_LOCAL_HOST + ':8080',
                    judge_url: this.judge_protocol + '://' + JUDGE_LOCAL_HOST + ':8080',
                    request:{
                        local_ip:'127.0.0.1',
                        timeout: 1000
                    }
                }
                let options = Object.assign(opts, data.judge_options)
                this.judge = new Judge(options)

                let erg = await this.judge.bootstrap()
                expect(erg).to.equal(true)

                erg = await this.judge.wakeup()
                expect(erg).to.equal(true)

                await this.proxy_server.start()
            }


            static async after() {
                await this.proxy_server.stop()
                await this.judge.pending()
                Log.enable = true
                this.proxy_server = null
                this.judge = null
            }


            @test
            async request() {

                let proxy_url = Clazz.proxy_server.url()
                let judgeReq = Clazz.judge.createRequest(proxy_url)
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
            }
        }

    })

})

process.on('uncaughtException', function (err: Error) {
    console.log(err);
});