import {Judge} from "../../src/lib/judge";
let mlog = require('mocha-logger')
import * as assert from 'assert'
import * as chai from 'chai'
let expect = chai.expect
import {Log} from "../../src/lib/logging";

import * as HttpProxy from "http-proxy";
import * as http from 'http'
import * as url from "url";



describe('Judge level tests', () => {

    describe('Level 1', () => {

        let judge = new Judge()
        let localip: string = null
        let mockServer = null
        let mockProxy: HttpProxy = null

        before(async function () {
            let erg = await judge.bootstrap()
            expect(erg).to.equal(true)

            localip = judge.remote_url.host

            erg = await judge.wakeup()
            expect(erg).to.equal(true)

            mockProxy = HttpProxy.createProxyServer()
            mockServer = http.createServer(function (req: http.IncomingMessage, res: http.ServerResponse) {
                let _url = url.parse(req.url)
                let target_url = _url.protocol + '//' + req.headers.host
                console.log(_url, target_url)
                mockProxy.web(req, res, {target: target_url})
            }).listen(8000, '0.0.0.0')

            console.log('before')
        })


        after((done) => {
            console.log('after')
            judge.pending().then(() => done()).catch((err) => done(err))
        })

        it('run test for local proxy', async function () {
            let results = await judge.runTests(url.parse(`http://${localip}:8080`))
            console.log(results)
        })


    })
})

process.on('uncaughtException', function (err:Error) {
    console.log(err);
});