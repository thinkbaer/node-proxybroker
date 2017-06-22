import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import * as child_process from 'child_process';
import {PlatformUtils} from "../../src/utils/PlatformUtils";

const NODE_COMMAND = '/usr/bin/node --require ts-node/register src/cli.ts'
const COMMAND = NODE_COMMAND + ' judge-file'

@suite('commands/JudgeFileCommand')
class JudgeFileCommandTest {

    @test @timeout(10000)
    'judge file with file' (done:Function) {
        child_process.exec(COMMAND + ' test/_files/proxylists/list01.csv',
            {
                cwd: PlatformUtils.pathNormilize(__dirname + '/../..')
            },
            function (err, stdout, stderr) {
                // console.log('ERR='+err, 'OUT='+stdout, 'STDERR='+stderr)
                let data = JSON.parse(stdout)
                data = data.shift()
                expect(data.ip).to.eq('127.0.0.1')
                expect(data.port).to.eq(3128)
                expect(data.http.error).to.be.false
                expect(data.https.error).to.be.true
                done()
            });
    }

    @test
    'judge file with no options' (done:Function) {
        child_process.exec(COMMAND,
            {
                cwd: PlatformUtils.pathNormilize(__dirname + '/../..')
            },
            function (err, stdout, stderr) {
                //console.log('ERR='+err, 'OUT='+stdout, 'STDERR='+stderr)
                expect(stderr).to.contain('cli.ts judge-file <file>')
                expect(stderr).to.contain('--verbose, -v')
                done()
            });
    }

    @test
    'judge file in usage' (done:Function) {
        child_process.exec(NODE_COMMAND,
            {
                cwd: PlatformUtils.pathNormilize(__dirname + '/../..')
            },
            function (err, stdout, stderr) {
                //console.log('ERR='+err, 'OUT='+stdout, 'STDERR='+stderr)
                expect(stderr).to.contain('judge-file <file>')
                done()
            });
    }

}