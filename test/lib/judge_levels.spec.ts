// process.env.NODE_DEBUG = 'request|tunnel'

import {Judge} from "../../src/lib/judge";
let mlog = require('mocha-logger')
import * as chai from 'chai'
let expect = chai.expect
import * as url from "url";

import {HTTPProxyServer_L3, HTTPProxyServer_L2, HTTPProxyServer_L1, HTTPProxyServer} from "../helper/server";
import * as _request from "request-promise-native";
import {RequestResponseMonitor} from "../../src/lib/request_response_monitor";
import {Log} from "../../src/lib/logging";

// https://www.proxynova.com/proxy-articles/proxy-anonymity-levels-explained

describe('Judge level', () => {

    let tests = [
        {
            // HTTP:C -> HTTP:PSL3 -> HTTP:S
            title: 'HTTP L3 transparent proxy',
            level: 3,
            server: HTTPProxyServer_L3,
            debug: false

        },
        {
            // HTTP:C -> HTTP:PSL2 -> HTTP:S
            title: 'HTTP L2 anonymus proxy',
            level: 2,
            server: HTTPProxyServer_L2,
            debug: false

        },
        {
            // HTTP:C -> HTTP:PSL1 -> HTTP:S
            title: 'HTTP L1 anonymus proxy',
            level: 1,
            server: HTTPProxyServer_L1,
            debug: false
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


    tests.forEach((data) => {

        describe(data.title, () => {

            let port: number = 5008
            let localip: string = '127.0.0.2'
            let judge: Judge = null
            let server: HTTPProxyServer = null


            before(async function () {
                Log.enable = false
                server = new data.server(port, localip, {})
                judge = new Judge({selftest: false, remote_lookup: false})

                let erg = await judge.bootstrap()
                expect(erg).to.equal(true)

                erg = await judge.wakeup()
                expect(erg).to.equal(true)

                await server.start()
            })


            after(async function () {
                await server.stop()
                await judge.pending()
                Log.enable = true
                server = null
                judge = null
            })


            it('http request', async function () {
                let proxy_url = `http://${localip}:${port}`
                // console.log('PROXY=' + proxy_url + ' TO ' + url.format(judge.remote_url))

                let judgeReq = judge.createRequest(proxy_url)
                judgeReq._debug = data.debug

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
            })
        })


    })

})

process.on('uncaughtException', function (err: Error) {
    console.log(err);
});