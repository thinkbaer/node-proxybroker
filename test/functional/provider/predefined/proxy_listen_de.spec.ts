import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {Log} from "@typexs/base";
import {ProxyListenDe} from "../../../../src/providers/proxy/ProxyListenDe";


@suite('provider/predefined/ProxyListenDe') @timeout(10000)
class Test {

  static before() {
    Log.options({enable: true,level:'debug'})
  }

  @test
  async 'get http'() {
    let p = new ProxyListenDe();
    p.selectVariant('http');
    let v = p.variant;
    expect(v.type).to.be.eq('http');
    let list = await p.get();
    expect(list).to.not.be.empty
  }

  @test
  async 'get https'() {
    let p = new ProxyListenDe();
    p.selectVariant('https');
    let v = p.variant;
    expect(v.type).to.be.eq('https');
    let list = await p.get();
    expect(list).to.not.be.empty
  }

  @test
  async 'get httphttps'() {
    let p = new ProxyListenDe();
    p.selectVariant('httphttps');
    let v = p.variant;
    expect(v.type).to.be.eq('httphttps');
    let list = await p.get();
    expect(list).to.not.be.empty
  }

}
