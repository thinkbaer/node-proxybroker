import {Judge} from "../../src/lib/judge";
let mlog = require('mocha-logger')
import * as assert from 'assert'
import * as chai from 'chai'
let expect = chai.expect
import {Log} from "../../src/lib/logging";

import * as HttpProxy from "http-proxy";
import * as http from 'http'
import * as url from "url";


describe('Judge', () => {

    describe('service runtime', () => {

        beforeEach(() => {
            Log.enable = false
        })

        afterEach(() => {
            Log.enable = true
        })

        it('get remote ip', async function () {
            let judge = new Judge()
            expect(judge['server_remote_ip']).to.equal(null)
            let erg = await judge['get_remote_accessible_ip']()
            assert.ok(judge['server_remote_ip'])
            mlog.success('Remote IP = ' + judge['server_remote_ip'])
        })


        it('wakeup, selftest and pending', async function () {
            let judge = new Judge()

            try {
                await judge['get_remote_accessible_ip']()
                expect(judge.remote_ip()).to.be.ok

                let r_wakedup = await judge.wakeup(true)
                expect(r_wakedup).to.equal(true)

                let r_selftest = await judge['selftest']()
                expect(r_selftest).to.equal(true)

                let r_pended = await judge.pending()
                expect(r_pended).to.equal(true)

                r_selftest = await judge['selftest']()
                expect(r_selftest).to.equal(false)
            } catch (err) {
                throw err
            } finally {
                Log.enable = true
            }
        })
    })


    describe('service bootstrap', () => {

        it('bootstrap', (done) => {
            let judge = new Judge()

            judge.bootstrap()
                .then((erg) => {
                    assert.equal(erg, true)
                    done()
                })
                .catch((err) => {
                    done(err)
                })
        })

    })

    describe('test proxy', () => {
        let judge = new Judge()
        let localip: string = null
        let mockServer = null
        let mockProxy: HttpProxy = null

        before(async function () {
            let erg = await judge.bootstrap()
            expect(erg).to.equal(true)

            localip = judge.remote_ip()

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
            let results = await judge.runTests({ip: localip, port: 8000})
            console.log(results)
        })


    })
})

process.on('uncaughtException', function (err:Error) {
    console.log(err);
});