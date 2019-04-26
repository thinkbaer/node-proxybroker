import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {Log} from "@typexs/base";
import {FreeProxyListsCom} from "../../../../src/providers/proxy/FreeProxyListsCom";


@suite('provider/predefined/FreeProxyListenCom') @timeout(10000)
class FreeProxyListsComTest {

    static before(){
        Log.options({enable:true,level:'debug'})
    }

    @test
    async 'get anonym'(){
        let p = new FreeProxyListsCom();
        p.selectVariant('anonym');
        let v = p.variant;
        expect(v.type).to.be.eq('anonym');
        let list = await p.get();
        expect(list).to.not.be.empty
    }
}
