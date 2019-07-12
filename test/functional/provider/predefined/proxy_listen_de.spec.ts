import {suite, test, timeout} from 'mocha-typescript';
import {expect} from 'chai';
import {Log} from '@typexs/base';
import {ProxyListenDe} from '../../../../src/providers/proxy/ProxyListenDe';


@suite('provider/predefined/ProxyListenDe')
class Test {

  static before() {
    Log.options({enable: false, level: 'debug'});
  }

  @test
  async 'get http'() {
    const p = new ProxyListenDe();
    p.selectVariant('http');
    const v = p.variant;
    expect(v.type).to.be.eq('http');
    const list = await p.get();
    expect(list).to.not.be.empty;
  }

  @test
  async 'get https'() {
    const p = new ProxyListenDe();
    p.selectVariant('https');
    const v = p.variant;
    expect(v.type).to.be.eq('https');
    const list = await p.get();
    expect(list).to.not.be.empty;
  }

  @test
  async 'get httphttps'() {
    const p = new ProxyListenDe();
    p.selectVariant('httphttps');
    const v = p.variant;
    expect(v.type).to.be.eq('httphttps');
    const list = await p.get();
    expect(list).to.not.be.empty;
  }

}
