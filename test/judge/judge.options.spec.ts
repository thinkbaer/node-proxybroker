import {suite, test} from "mocha-typescript";
import {Judge} from "../../src/judge/Judge";

import * as _ from "lodash";
import {Log} from "../../src/lib/logging/Log";
import {DEFAULT_JUDGE_OPTIONS} from "../../src/judge/IJudgeOptions";
import {expect} from "chai";

describe('', () => {
});

/**
 * Testing internal functionality and remote access to judge server
 *
 * Note: for remote access the used ip will be used, for this the firewall must allow access to the port 8080
 */

const SSL_PATH = '../_files/ssl';


@suite('judge/Judge - options')
class JudgeTestSuite1 {
    before() {
        Log.options({enable: false});
    }

    @test
    'default settings'() {
        let judge = new Judge();
        let options = judge.options;
        expect(judge.isSecured).to.equal(false);
        expect(judge.judge_url_f).to.equal('http://0.0.0.0:8080/');
        expect(options.selftest).to.equal(true);
        expect(options.remote_lookup).to.equal(true)
    }

    @test
    'change address settings'() {
        let options = _.clone(DEFAULT_JUDGE_OPTIONS);
        options.judge_url = 'http://judge.local:8081';
        let judge = new Judge(options);
        expect(judge.judge_url_f).to.equal('http://judge.local:8081/')
    }

    @test
    'change remote address settings'() {
        let options = _.clone(DEFAULT_JUDGE_OPTIONS);
        options.remote_url = 'http://judge.local:8081';
        // options.remote_url = 'http://judge.local:8081'
        let judge = new Judge(options);
        // expect(judge.judge_url_f).to.equal('http://judge.local:8081/')
        expect(judge.remote_url_f).to.equal('http://judge.local:8081/')
    }

    @test
    'enable https settings'() {
        let options = _.clone(DEFAULT_JUDGE_OPTIONS);
        options.judge_url = 'https://0.0.0.0:8081';
        options.key_file = __dirname + '/' + SSL_PATH + '/judge/server-key.pem';
        options.cert_file = __dirname + '/' + SSL_PATH + '/judge/server-cert.pem';
        let judge = new Judge(options);

        options = judge.options;
        expect(judge.isSecured).to.equal(true);
        expect(judge.judge_url_f).to.equal('https://0.0.0.0:8081/');
        expect(options.ssl_options.key).to.be.not.empty;
        expect(options.ssl_options.cert).to.be.not.empty;
        expect(options.selftest).to.equal(true);
        expect(options.remote_lookup).to.equal(true)
    }

}
