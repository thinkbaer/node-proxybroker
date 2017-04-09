// process.env.NODE_DEBUG = 'request|tunnel'
// process.env.NODE_DEBUG = ' request tunnel node '
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as mUrl from 'url'
import * as tls from 'tls'

import {Judge} from "../../src/lib/judge";
let mlog = require('mocha-logger')
import * as chai from 'chai'
let expect = chai.expect
import * as url from "url";

import {HTTPProxyServer_L3, HTTPProxyServer_L2, HTTPProxyServer_L1, HTTPProxyServer} from "../helper/server";
import * as _request from "request-promise-native";
import {RequestResponseMonitor} from "../../src/lib/request_response_monitor";
import {Log} from "../../src/lib/logging";
import {RequestResponse} from "request";

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

    let variations = [
        {
            title: 'HTTP Client <-> HTTP Proxy L3 <-> HTTP Judge',
            level: 3,
            server: HTTPProxyServer_L3,
            debug: true,
            judge_secured: false,
            judge_options: {}
        },
        {
            title: 'HTTP Client <-> HTTP Proxy L2 <-> HTTP Judge',
            level: 2,
            server: HTTPProxyServer_L2,
            debug: false,
            judge_secured: false,
            judge_options: {}

        },
        {
            title: 'HTTP Client <-> HTTP Proxy L1 <-> HTTP Judge',
            level: 1,
            server: HTTPProxyServer_L1,
            judge_secured: false,
            debug: false,
            judge_options: {}
        },
        {
            title: 'HTTP Client <-> HTTP Proxy L1 <-> HTTPS Judge (only L1)',
            level: 1,
            server: HTTPProxyServer_L1,
            debug: true,
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
            let proxy_server: HTTPProxyServer = null
            let protocol = (data.judge_secured ? 'https' : 'http')

            before(async function () {
                Log.enable = data.debug
                proxy_server = new data.server(proxy_port, proxy_ip, {})
                proxy_server._debug = data.debug
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
            /*
             xit(protocol + ' request 2', async function () {
             try {
             let rp = _request({
             url: 'https://judge.local:8080/ping',
             method: 'GET',
             proxy: proxy_server.url(),
             ca: judge.options.ssl_options.cert,
             })

             rp.once('connect', function (res: any, socket: net.Socket, head: Buffer) {
             console.log('CONNECT')
             rp.removeAllListeners()
             socket.removeAllListeners()
             })

             rp.once('response', function (res: any) {
             console.log('RESPONSE')
             })

             rp.once('error', function (err: any) {
             console.error('ERROR',err)
             })

             let response = await rp.promise()

             } catch (err) {
             throw err
             }
             })
             */

            it(protocol + ' request', async function () {

                let proxy_url = proxy_server.url()
                // console.log('PROXY=' + proxy_url + ' TO ' + judge.remote_url_f)
                let judgeReq = judge.createRequest(proxy_url,{local_ip : '127.0.0.1' })
                judgeReq._debug = data.debug

                try {
                    let rrm = await judgeReq.performRequest()
                    let log = rrm.logToString()

                    if (judgeReq._debug) {
                        console.log('-------->')
                        console.log(log)
                        console.log('<--------')
                    }

                    expect(judgeReq.level).to.be.equal(data.level)
                    expect(log).to.match(/Judge connected/)
                    expect(log).to.match(new RegExp('Proxy is L' + data.level))
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