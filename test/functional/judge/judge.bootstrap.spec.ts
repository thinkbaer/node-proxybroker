import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {Log} from "@typexs/base";
import {Judge} from "../../../src/libs/judge/Judge";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * Testing internal functionality and remote access to judge server
 *
 * Note: for remote access the used ip will be used, for this the firewall must allow access to the port 8080
 */


if (!process.env.CI_CONTAINER) {

  /**
   * This test doesn't work in a extern test container like travis
   */
  @suite('judge/Judge - prepare (no SSL)')
  class JudgeTestSuite1 {

    static before() {
      Log.options({enable: false, level: 'debug'})
    }


    @test
    async 'bootstrap'() {
      let judge = new Judge();

      let erg = await judge.prepare();
      expect(erg).to.be.eq(true);
    }
  }
}

