import {suite, test} from "mocha-typescript";
import {Judge} from "../../src/judge/Judge";
import {Log} from "../../src/lib/logging/Log";
import {expect} from "chai";
import {DEFAULT_JUDGE_OPTIONS, IJudgeOptions} from "../../src/judge/IJudgeOptions";
import * as _ from "lodash";

describe('', () => {
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
/**
 * Testing internal functionality and remote access to judge server
 *
 * Note: for remote access the used ip will be used, for this the firewall must allow access to the port 8080
 */

const SSL_PATH = '../_files/ssl';

let initial_remote_ip = 'http://127.0.0.1:8081';

@suite('judge/Judge - lifecycle operations')
class JudgeTestSuite1 {


    static before() {
        Log.options({enable: true, level: 'debug'})
    }

    /**
     * Test can be only done local, because the certificate is registered for judge.local
     */
    @test
    async 'positive selftest with modified options'() {
        let options: IJudgeOptions = {ssl: {}}
        options.remote_ip = 'judge.local';
        options.ip = 'judge.local';
        options.http_port = 8081
        options.https_port = 8082
        options.ssl.key_file = __dirname + '/' + SSL_PATH + '/judge/server-key.pem';
        options.ssl.cert_file = __dirname + '/' + SSL_PATH + '/judge/server-cert.pem';
        options.remote_lookup = false;

        let judge = new Judge(options);
        // expect(judge.isSecured).to.be.equal(true);

        let r_wakedup = await judge.wakeup(true);
        let r_selftest = await judge['selftest']();
        let r_pended = await judge.pending();

        expect(r_wakedup).to.equal(true);
        expect(r_selftest).to.equal(true);
        expect(r_pended).to.equal(true)
    }



    @test.only
    async 'negative selftest'() {
        let judge = new Judge();

        await judge['getRemoteAccessibleIp']();
        expect(judge.remote_url('http')).to.not.equal(initial_remote_ip);

        let r_selftest = await judge['selftest']();
        expect(r_selftest).to.equal(false)
    }


}

