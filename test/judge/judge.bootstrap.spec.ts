import {suite, test} from "mocha-typescript";
import {Judge} from "../../src/judge/Judge";
import {Log} from "../../src/libs/generic/logging/Log";
import {expect} from "chai";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('', () => {
});

/**
 * Testing internal functionality and remote access to judge server
 *
 * Note: for remote access the used ip will be used, for this the firewall must allow access to the port 8080
 */

const SSL_PATH = '../_files/ssl';

let initial_remote_ip = 'http://127.0.0.1:8080';


if (!process.env.CI_CONTAINER) {
    /**
     * This test doesn't work in a extern test container like travis
     */
    @suite('judge/Judge - bootstrap (no SSL)')
    class JudgeTestSuite1 {

        static before() {
            Log.options({enable: false, level:'debug'})
        }


        @test
        async 'bootstrap'() {
            let judge = new Judge();

            let erg = await judge.bootstrap()
            expect(erg).to.be.eq(true);
        }
    }
}


process.on('uncaughtException', function (err: Error) {
    console.log(err);
});