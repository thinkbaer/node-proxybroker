import {suite, test} from "mocha-typescript";
import {Judge} from "../../src/judge/Judge";
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
@suite('judge/Judge - functional')
class JudgeTestSuite1 {


    @test
    async 'get remote ip'() {
        let judge = new Judge();
        let erg = await judge['get_remote_accessible_ip']();
        expect(erg.href).to.not.equal(initial_remote_ip);
        expect(erg.hostname).to.match(/\d+\.\d+\.\d+\.\d+/)
    }
    

}
