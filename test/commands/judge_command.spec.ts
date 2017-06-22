import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import * as child_process from 'child_process';
import {PlatformUtils} from "../../src/utils/PlatformUtils";


const NODE_COMMAND = '/usr/bin/node --require ts-node/register src/cli.ts'
const COMMAND = NODE_COMMAND + ' judge-ip'

@suite('commands/JudgeCommand')
class JudgeCommandTest {

    @test
    'judge with no options' (done:Function) {
        child_process.exec(COMMAND,
            {
                cwd: PlatformUtils.pathNormilize(__dirname + '/../..')
            },
            function (err, stdout, stderr) {
                //console.log('ERR='+err, 'OUT='+stdout, 'STDERR='+stderr)
                expect(stderr).to.contain('cli.ts judge-ip <ip> <port>')
                expect(stderr).to.contain('--verbose, -v')
                done()
            });
    }

    @test
    'judge in usage' (done:Function) {
        child_process.exec(NODE_COMMAND,
            {
                cwd: PlatformUtils.pathNormilize(__dirname + '/../..')
            },
            function (err, stdout, stderr) {
                //console.log('ERR='+err, 'OUT='+stdout, 'STDERR='+stderr)
                expect(stderr).to.contain('judge-ip <ip> <port>')
                done()
            });
    }

}