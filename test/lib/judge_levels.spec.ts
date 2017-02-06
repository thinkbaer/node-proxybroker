// process.env.NODE_DEBUG = 'request|tunnel'

import {Judge} from "../../src/lib/judge";
let mlog = require('mocha-logger')
import * as chai from 'chai'
let expect = chai.expect
import * as url from "url";

import {HTTPProxyServer_L1} from "../helper/server";
import * as _request from "request-promise-native";
import {RequestResponseMonitor} from "../../src/lib/request_response_monitor";

// https://www.proxynova.com/proxy-articles/proxy-anonymity-levels-explained

describe('Judge level', () => {

    describe('HTTP L1 Proxy', () => {

        let port: number = 5008
        let localip: string = '127.0.0.2'
        let judge: Judge = null
        let server: HTTPProxyServer_L1 = null

        before(async function () {
            server = new HTTPProxyServer_L1(port, localip, {})
            judge = new Judge({selftest: false, remote_lookup: false})

            let erg = await judge.bootstrap()
            expect(erg).to.equal(true)

            erg = await judge.wakeup()
            expect(erg).to.equal(true)

            await server.start()
            console.log('before')
        })

        after(async function () {
            console.log('after')
            await server.stop()
            await judge.pending()
            server = null
            judge = null
        })


        it('http request', async function () {
            let proxy_url = `http://${localip}:${port}`
            console.log('PROXY=' + proxy_url + ' TO ' + url.format(judge.remote_url))

            let judgeReq = judge.createRequest(proxy_url)
            // judgeReq._debug = true

            let rrm = await judgeReq.performRequest()

            let r = judgeReq.analyse()

/*
            let request_url = url.format(judge.remote_url) + '/judge/'
            //_request['debug'] = true


            requestPromise['debug'] = true
            let rrm = RequestResponseMonitor.monitor(requestPromise)
            rrm._debug = true
            let response = await requestPromise
            await rrm.promise()
*/
            console.log(rrm.logToString())
            // console.log(response)
        })

        /*
         it('http request', async function () {
         let proxy_url = `http://${localip}:${port}`
         console.log('PROXY=' + proxy_url + ' TO ' + url.format(judge.remote_url))

         //_request['debug'] = true
         let requestPromise = _request.get(url.format(judge.remote_url), {
         resolveWithFullResponse: true,
         proxy: proxy_url,
         timeout: 10000
         })

         requestPromise['debug'] = true
         let rrm = RequestResponseMonitor.monitor(requestPromise)
         rrm._debug = true
         let response = await requestPromise
         await rrm.promise()

         console.log(rrm.logToString())

         // console.log(response)
         })
         */
    })
})

process.on('uncaughtException', function (err: Error) {
    console.log(err);
});