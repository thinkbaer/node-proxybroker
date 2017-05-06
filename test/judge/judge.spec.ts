import {Judge} from "../../src/lib/judge";


import * as chai from 'chai'
let expect = chai.expect
import {Log} from "../../src/lib/logging";
import * as HttpProxy from "http-proxy";

import * as http from 'http'
import * as url from "url";

/**
 * Testing internal functionality and remote access to judge server
 *
 * Note: for remote access the used ip will be used, for this the firewall must allow access to the port 8080
 */


describe('Judge', () => {

    describe('options tests', () => {

        it('default settings', () => {
            let judge = new Judge()
            let options = judge.options
            expect(judge.isSecured).to.equal(false)
            expect(judge.judge_url_f).to.equal('http://0.0.0.0:8080/')
            expect(options.selftest).to.equal(true)
            expect(options.remote_lookup).to.equal(true)
        })

        it('change address settings', () => {
            let options = Judge.default_options()
            options.judge_url = 'http://judge.local:8081'
            let judge = new Judge(options)
            expect(judge.judge_url_f).to.equal('http://judge.local:8081/')
        })

        it('change remote address settings', () => {
            let options = Judge.default_options()
            options.remote_url = 'http://judge.local:8081'
            // options.remote_url = 'http://judge.local:8081'
            let judge = new Judge(options)
            // expect(judge.judge_url_f).to.equal('http://judge.local:8081/')
            expect(judge.remote_url_f).to.equal('http://judge.local:8081/')
        })

        it('enable https settings', () => {
            let options = Judge.default_options()
            options.judge_url = 'https://0.0.0.0:8081'
            options.key_file = __dirname + '/../ssl/judge/server-key.pem'
            options.cert_file = __dirname + '/../ssl/judge/server-cert.pem'
            let judge = new Judge(options)

            options = judge.options
            expect(judge.isSecured).to.equal(true)
            expect(judge.judge_url_f).to.equal('https://0.0.0.0:8081/')
            expect(options.ssl_options.key).to.be.not.empty
            expect(options.ssl_options.cert).to.be.not.empty
            expect(options.selftest).to.equal(true)
            expect(options.remote_lookup).to.equal(true)
        })

    })

    describe('method tests', () => {
        let initial_remote_ip = 'http://127.0.0.1:8080'

        it('get remote ip', async function () {
            let judge = new Judge()
            let erg = await judge['get_remote_accessible_ip']()
            expect(erg.href).to.not.equal(initial_remote_ip)
            expect(erg.hostname).to.match(/\d+\.\d+\.\d+\.\d+/)
        })

    })

    describe('tests service lifecycle operations (no SSL)', () => {
        let initial_remote_ip = 'http://127.0.0.1:8080'

        beforeEach(() => {
            Log.enable = false
        })

        afterEach(() => {
            Log.enable = true
        })


        it('positive selftest', async function () {
            let judge = new Judge({})

            try {
                await judge['get_remote_accessible_ip']()
                expect(judge.remote_url.host).to.not.equal(initial_remote_ip)

                let r_wakedup = await judge.wakeup(true)
                expect(r_wakedup).to.equal(true)

                let r_selftest = await judge['selftest']()
                expect(r_selftest).to.equal(true)

                let r_pended = await judge.pending()
                expect(r_pended).to.equal(true)
            } catch (err) {
                throw err
            } finally {
                Log.enable = true
            }
        })

        it('negative selftest', async function () {
            let judge = new Judge({debug:true})

            try {
                await judge['get_remote_accessible_ip']()
                expect(judge.remote_url.host).to.not.equal(initial_remote_ip)

                let r_selftest = await judge['selftest']()
                expect(r_selftest).to.equal(false)

            } catch (err) {
                throw err
            } finally {
                Log.enable = true
            }
        })
    })

    describe('tests service lifecycle operations (with SSL)', () => {
        let initial_remote_ip = 'http://127.0.0.1:8080'

        beforeEach(() => {
            Log.enable = false
        })

        afterEach(() => {
            Log.enable = true
        })

        /**
         * Test can be only done local, because the certificate is registered for judge.local
         */
        it('positive selftest (judge.local)', async function () {
            let options = Judge.default_options()
            options.judge_url = 'https://judge.local:8081'
            options.remote_url = 'https://judge.local:8081'
            options.key_file = __dirname + '/../ssl/judge/server-key.pem'
            options.cert_file = __dirname + '/../ssl/judge/server-cert.pem'
            options.remote_lookup = false

            let judge = new Judge(options)
            expect(judge.isSecured).to.be.equal(true)

            try {
                let r_wakedup = await judge.wakeup(true)
                expect(r_wakedup).to.equal(true)

                let r_selftest = await judge['selftest']()
                expect(r_selftest).to.equal(true)

                let r_pended = await judge.pending()
                expect(r_pended).to.equal(true)
            } catch (err) {
                throw err
            } finally {
                Log.enable = true
            }
        })

    })

    describe('test service default bootstrap (no SSL)', () => {
        beforeEach(() => {
            Log.enable = false
        })

        afterEach(() => {
            Log.enable = true
        })

        it('bootstrap', (done) => {
            let judge = new Judge()
            judge.bootstrap()
                .then((erg) => {
                    expect(erg).to.be.eq(true)
                    done()
                })
                .catch((err) => {
                    expect(err).to.be.empty
                    done(err)
                })
        })

    })




    /**
     * This test must be rewritten, currently testing in judge_levels
     *
     * TODO write collection of analysis tools
     */
    xdescribe('test proxy (TODO!)', () => {
        let judge = new Judge()
        let mockServer = null
        let mockProxy: HttpProxy = null

        before(async function () {
            let erg = await judge.bootstrap()
            expect(erg).to.equal(true)

            erg = await judge.wakeup()
            expect(erg).to.equal(true)

            mockProxy = HttpProxy.createProxyServer()
            mockServer = http.createServer(function (req: http.IncomingMessage, res: http.ServerResponse) {
                let _url = url.parse(req.url)
                let target_url = _url.protocol + '//' + req.headers.host
                mockProxy.web(req, res, {target: target_url})
            }).listen(8000, '0.0.0.0')
        })


        after((done) => {

            judge.pending().then(() => done()).catch((err) => done(err))
        })

        it('run test for local proxy', async function () {
            let results = await judge.runTests(url.parse(`http://${judge.remote_url.hostname}:8080`))
            console.log(results)
        })


    })
})

process.on('uncaughtException', function (err:Error) {
    console.log(err);
});