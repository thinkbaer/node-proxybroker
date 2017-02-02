import {Judge} from "../../src/lib/judge";
let mlog = require('mocha-logger')
import * as chai from 'chai'
let expect = chai.expect
import * as url from "url";

import {HTTPProxyServer_L1} from "../helper/server";

// https://www.proxynova.com/proxy-articles/proxy-anonymity-levels-explained

describe('Judge level tests', () => {

    describe('L1', () => {

        let port = 8008
        let localip = '127.0.0.1'
        let judge = new Judge()
        let server:HTTPProxyServer_L1 = new HTTPProxyServer_L1(port,'127.0.0.1',{})

        before(async function () {
            let erg = await judge.bootstrap()
            expect(erg).to.equal(true)
            localip = judge.remote_url.host

            erg = await judge.wakeup()
            expect(erg).to.equal(true)

            await server.start()
            console.log('before')
        })


        after(async function() {
            console.log('after')
            await server.stop()
            await judge.pending()
        })

        it('run', async function () {
            let results = await judge.runTests(url.parse(`http://${localip}:${port}`))
            console.log(results)
        })


    })
})

process.on('uncaughtException', function (err:Error) {
    console.log(err);
});