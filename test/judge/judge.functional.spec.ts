import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {Judge} from "../../src/libs/judge/Judge";

describe('', () => {
});

/**
 * Testing internal functionality and remote access to judge server
 *
 * Note: for remote access the used ip will be used, for this the firewall must allow access to the port 8080
 */

const SSL_PATH = '../_files/ssl';

let initial_remote_ip = '127.0.0.1';

@suite('judge/Judge - functional')
class JudgeTestSuite1 {


  @test
  async 'get remote ip'() {
    let judge = new Judge();
    let erg = await judge['getRemoteAccessibleIp']();
    expect(erg).to.not.equal(initial_remote_ip);
    expect(erg).to.match(/\d+\.\d+\.\d+\.\d+/)
  }


}
