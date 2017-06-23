import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import SpawnCLI from "./SpawnCLI";

@suite('commands/JudgeCommand') @timeout(10000)
class JudgeCommandTest {


    @test
    async 'judge-ip with empty parameter'() {
        let cli = await SpawnCLI.run('judge-ip')
        expect(cli.stderr).to.contain('cli.ts judge-ip <ip> <port>')
        expect(cli.stderr).to.contain('--verbose, -v')
    }

    @test
    async 'judge-ip in usage'() {
        let cli = await SpawnCLI.run()
        expect(cli.stderr).to.contain('judge-ip <ip> <port>')
    }

}