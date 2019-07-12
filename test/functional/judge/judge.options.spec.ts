import {suite, test} from 'mocha-typescript';
import * as _ from 'lodash';
import {expect} from 'chai';
import {Log} from '@typexs/base';
import {DEFAULT_JUDGE_OPTIONS} from '../../../src/libs/judge/IJudgeOptions';
import {Judge} from '../../../src/libs/judge/Judge';
import {TestHelper} from '../TestHelper';


/**
 * Testing internal functionality and remote access to judge server
 *
 * Note: for remote access the used ip will be used, for this the firewall must allow access to the port 8080
 */

@suite('judge/Judge - options')
class JudgeTestSuite1 {
  before() {
    Log.options({enable: false});
  }

  @test
  'default settings'() {
    const judge = new Judge();
    const options = judge.options;

    expect(judge.ip).to.equal('0.0.0.0');
    expect(options.http_port).to.equal(8080);
    expect(options.https_port).to.equal(8181);
    expect(options.selftest).to.equal(true);
    expect(options.remote_lookup).to.equal(true);
  }

  @test
  'change address settings'() {
    const options = _.clone(DEFAULT_JUDGE_OPTIONS);
    options.ip = 'judge.local';
    options.http_port = 8081;
    const judge = new Judge(options);
    expect(judge.url('http')).to.equal('http://judge.local:8081');
    expect(judge.url('https')).to.equal('https://judge.local:8181');
  }

  @test
  'change remote address settings'() {
    const options = _.clone(DEFAULT_JUDGE_OPTIONS);
    options.remote_ip = 'judge.local';
    options.http_port = 8081;
    // options.remote_url = 'http://judge.local:8081'
    const judge = new Judge(options);
    // expect(judge.judge_url_f).to.equal('http://judge.local:8081/')
    expect(judge.remote_url('http')).to.equal('http://judge.local:8081');
  }

  @test
  'enable https settings'() {
    let options = _.clone(DEFAULT_JUDGE_OPTIONS);
    options.http_port = 8081;
    options.ssl.key_file = TestHelper.sslPath('judge/server-key.pem');
    options.ssl.cert_file = TestHelper.sslPath('judge/server-cert.pem');
    const judge = new Judge(options);

    options = judge.options;

    expect(judge.url('http')).to.equal('http://0.0.0.0:8081');
    expect(judge.url('https')).to.equal('https://0.0.0.0:8181');
    expect(options.ssl.key).to.be.not.empty;
    expect(options.ssl.cert).to.be.not.empty;
    expect(options.selftest).to.equal(true);
    expect(options.remote_lookup).to.equal(true);
  }

}
