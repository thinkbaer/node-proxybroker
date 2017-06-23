import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import SpawnCLI from "./SpawnCLI";


@suite('commands/JudgeFileCommand') @timeout(20000)
class JudgeFileCommandTest {

    @test.only
    async 'judge file with file'() {
        let cfg = {remote_lookup: false, selftest: false, judge_url: "http://127.0.0.1:8080"}
        let cli = await SpawnCLI.run('judge-file', 'test/_files/proxylists/list01.csv', '-v', '-c', JSON.stringify(cfg))
        console.log(cli.stdout)

        let data = JSON.parse(cli.stdout)
        data = data.shift()
        expect(data.ip).to.eq('127.0.0.1')
        expect(data.port).to.eq(3128)
        expect(data.http.error).to.be.false
        expect(data.https.error).to.be.true
    }

    @test
    async 'judge file with empty parameter'() {
        let cli = await SpawnCLI.run('judge-file')
        expect(cli.stderr).to.contain('cli.ts judge-file <file>')
        expect(cli.stderr).to.contain('--verbose, -v')
    }

    @test
    async 'judge file in usage'() {
        let cli = await SpawnCLI.run()
        expect(cli.stderr).to.contain('judge-file <file>')
    }

}