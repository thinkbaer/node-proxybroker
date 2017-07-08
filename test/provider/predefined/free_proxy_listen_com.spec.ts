import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'
import {FreeProxyListsCom} from "../../../src/provider/predefined/FreeProxyListsCom";


@suite('provider/predefined/FreeProxyListenCom') @timeout(10000)
class FreeProxyListsComTest {


    @test
    async 'get anonym'(){
        let p = new FreeProxyListsCom();
        p.selectVariant('anonym');
        let v = p.variant;
        expect(v.type).to.be.eq('anonym');
        let list = await p.get();
        expect(list.length).to.not.be.empty

    }
}