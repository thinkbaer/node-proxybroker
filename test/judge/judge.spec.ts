import {Judge} from "../../src/judge/Judge";

import * as _ from "lodash";
import * as chai from "chai";
import {Log} from "../../src/lib/logging/Log";
import {DEFAULT_JUDGE_OPTIONS} from "../../src/judge/IJudgeOptions";
let expect = chai.expect;

/**
 * Testing internal functionality and remote access to judge server
 *
 * Note: for remote access the used ip will be used, for this the firewall must allow access to the port 8080
 */

const SSL_PATH = '../_files/ssl';

describe('Judge', () => {

    describe('options tests', () => {

        before(() => {
            Log.options({enable:false});
        })


        it('default settings', () => {
            let judge = new Judge();
            let options = judge.options;
            expect(judge.isSecured).to.equal(false);
            expect(judge.judge_url_f).to.equal('http://0.0.0.0:8080/');
            expect(options.selftest).to.equal(true);
            expect(options.remote_lookup).to.equal(true)
        });

        it('change address settings', () => {
            let options = _.clone(DEFAULT_JUDGE_OPTIONS);
            options.judge_url = 'http://judge.local:8081';
            let judge = new Judge(options);
            expect(judge.judge_url_f).to.equal('http://judge.local:8081/')
        });

        it('change remote address settings', () => {
            let options = _.clone(DEFAULT_JUDGE_OPTIONS);
            options.remote_url = 'http://judge.local:8081';
            // options.remote_url = 'http://judge.local:8081'
            let judge = new Judge(options);
            // expect(judge.judge_url_f).to.equal('http://judge.local:8081/')
            expect(judge.remote_url_f).to.equal('http://judge.local:8081/')
        });

        it('enable https settings', () => {
            let options = _.clone(DEFAULT_JUDGE_OPTIONS);
            options.judge_url = 'https://0.0.0.0:8081';
            options.key_file = __dirname + '/'+SSL_PATH+'/judge/server-key.pem';
            options.cert_file = __dirname + '/'+SSL_PATH+'/judge/server-cert.pem';
            let judge = new Judge(options);

            options = judge.options;
            expect(judge.isSecured).to.equal(true);
            expect(judge.judge_url_f).to.equal('https://0.0.0.0:8081/');
            expect(options.ssl_options.key).to.be.not.empty;
            expect(options.ssl_options.cert).to.be.not.empty;
            expect(options.selftest).to.equal(true);
            expect(options.remote_lookup).to.equal(true)
        })

    });

    describe('method tests', () => {
        let initial_remote_ip = 'http://127.0.0.1:8080';

        it('get remote ip', async function () {
            let judge = new Judge();
            let erg = await judge['get_remote_accessible_ip']();
            expect(erg.href).to.not.equal(initial_remote_ip);
            expect(erg.hostname).to.match(/\d+\.\d+\.\d+\.\d+/)
        })

    });

    describe('tests service lifecycle operations (no SSL)', () => {
        let initial_remote_ip = 'http://127.0.0.1:8080';

        beforeEach(() => {
            Log.enable = false
        });

        afterEach(() => {
            Log.enable = true
        });


        it('positive selftest', async function () {

            let judge = new Judge({debug: true});

            try {
                await judge['get_remote_accessible_ip']();
                let r_wakedup = await judge.wakeup(true);
                let r_selftest = await judge['selftest']();
                let r_pended = await judge.pending();

                expect(judge.remote_url.host).to.not.equal(initial_remote_ip);
                expect(r_wakedup).to.equal(true);
                expect(r_selftest).to.equal(true);
                expect(r_pended).to.equal(true)
            } catch (err) {
                throw err
            } finally {
                Log.enable = true
            }
        });

        it('negative selftest', async function () {
            let judge = new Judge({debug: true});

            try {
                await judge['get_remote_accessible_ip']();
                expect(judge.remote_url.host).to.not.equal(initial_remote_ip);

                let r_selftest = await judge['selftest']();
                expect(r_selftest).to.equal(false)

            } catch (err) {
                throw err
            } finally {
                Log.enable = true
            }
        })
    });

    describe('tests service lifecycle operations (with SSL)', () => {
        // let initial_remote_ip = 'http://127.0.0.1:8080';

        beforeEach(() => {
            Log.enable = false;
        });

        afterEach(() => {
            Log.enable = true
        });

        /**
         * Test can be only done local, because the certificate is registered for judge.local
         */
        it('positive selftest (judge.local)', async function () {
            let options = _.clone(DEFAULT_JUDGE_OPTIONS);
            options.judge_url = 'https://judge.local:8081';
            options.remote_url = 'https://judge.local:8081';
            options.key_file = __dirname + '/'+SSL_PATH+'/judge/server-key.pem';
            options.cert_file = __dirname + '/'+SSL_PATH+'/judge/server-cert.pem';
            options.remote_lookup = false;

            let judge = new Judge(options);
            expect(judge.isSecured).to.be.equal(true);

            try {
                let r_wakedup = await judge.wakeup(true);
                expect(r_wakedup).to.equal(true);

                let r_selftest = await judge['selftest']();
                expect(r_selftest).to.equal(true);

                let r_pended = await judge.pending();
                expect(r_pended).to.equal(true)
            } catch (err) {
                throw err
            } finally {
                Log.enable = true
            }
        })

    });





    if (!process.env.CI_CONTAINER) {
        /**
         * This test doesn't work in a extern test container like travis
         */

        describe('test service default bootstrap (no SSL)', () => {
            beforeEach(() => {
                Log.enable = false
            });

            afterEach(() => {
                Log.enable = true
            });

            it('bootstrap', function(done:Function) {
                let judge = new Judge();
                judge.bootstrap()
                    .then((erg) => {
                        expect(erg).to.be.eq(true);
                        done()
                    })
                    .catch((err) => {
                        expect(err).to.be.empty;
                        done(err)
                    })
            })
        })
    }
});

process.on('uncaughtException', function (err: Error) {
    console.log(err);
});