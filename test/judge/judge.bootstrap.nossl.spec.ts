import {suite, test} from "mocha-typescript";
import {Judge} from "../../src/judge/Judge";
import {Log} from "../../src/lib/logging/Log";
import {expect} from "chai";

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

        before() {
            Log.enable = false
        }

        after() {
            Log.enable = true
        }

        @test
        'bootstrap'(done: Function) {
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
        }
    }
}


process.on('uncaughtException', function (err: Error) {
    console.log(err);
});