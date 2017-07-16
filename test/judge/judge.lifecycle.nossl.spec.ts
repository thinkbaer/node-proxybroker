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
@suite('judge/Judge - lifecycle operations (no SSL)')
class JudgeTestSuite1 {

    
    before() {
        Log.enable = false
    }

    after() {
        Log.enable = true
    }

    @test
    async 'positive selftest'() {

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
    }

    @test
    async 'negative selftest'() {
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
    }


}

