import {suite, test} from 'mocha-typescript';
import {expect} from 'chai';
import {Log} from '@typexs/base';
import {FreeProxyListsCom} from '../../../../src/providers/proxy/FreeProxyListsCom';


@suite('provider/predefined/FreeProxyListenCom')
class FreeProxyListsComTest {

  static before() {
    Log.options({enable: false, level: 'debug'});
  }

  @test
  async 'get anonym'() {
    const p = new FreeProxyListsCom();
    p.selectVariant('anonym');
    const v = p.variant;
    expect(v.type).to.be.eq('anonym');
    const list = await p.get();
    expect(list).to.not.be.empty;
  }
}
