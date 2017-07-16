import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
describe('', () => {
});


let stdMocks = require('std-mocks');

@suite('cli') @timeout(20000)
class CLITest {

    @test.skip()
    'test'(){
        expect(1).to.eq(1)
    }


}