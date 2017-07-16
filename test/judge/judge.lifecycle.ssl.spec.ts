import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {Judge} from "../../src/judge/Judge";

import * as _ from "lodash";
import {Log} from "../../src/lib/logging/Log";
import {DEFAULT_JUDGE_OPTIONS} from "../../src/judge/IJudgeOptions";

describe('', () => {
});
import {expect} from "chai";

/**
 * Testing internal functionality and remote access to judge server
 *
 * Note: for remote access the used ip will be used, for this the firewall must allow access to the port 8080
 */

const SSL_PATH = '../_files/ssl';

let initial_remote_ip = 'http://127.0.0.1:8080';
@suite('judge/Judge - lifecycle operations (with SSL)')
class JudgeTestSuite1 {

    // let initial_remote_ip = 'http://127.0.0.1:8080';

    before() {
        Log.enable = false;
    }

    after() {
        Log.enable = true
    }

    /**
     * Test can be only done local, because the certificate is registered for judge.local
     */
    @test
    async 'positive selftest (judge.local)'() {
        let options = _.clone(DEFAULT_JUDGE_OPTIONS);
        options.judge_url = 'https://judge.local:8081';
        options.remote_url = 'https://judge.local:8081';
        options.key_file = __dirname + '/' + SSL_PATH + '/judge/server-key.pem';
        options.cert_file = __dirname + '/' + SSL_PATH + '/judge/server-cert.pem';
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
    }


}
