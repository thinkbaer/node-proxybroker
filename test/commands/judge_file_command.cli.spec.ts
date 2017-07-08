import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import SpawnCLI from "./SpawnCLI";
import {IProxyServerOptions} from "../../src/server/IProxyServerOptions";
import {ProxyServer} from "../../src/server/ProxyServer";

const cfg = {remote_lookup: false, selftest: false, judge_url: "http://127.0.0.1:8080"};


@suite('commands/JudgeFileCommand - CLI version') @timeout(20000)
class CLIJudgeFileCommandTest {



    @test
    async 'judge file with file'() {

        let proxy_options : IProxyServerOptions = Object.assign({}, {
            url: 'http://127.0.0.1:3128',
            level: 3
        });

        let http_proxy_server = new ProxyServer(proxy_options);

        await http_proxy_server.start();
        let cli = await SpawnCLI.run('judge-file', 'test/_files/proxylists/list01.csv', '-v', '-c', JSON.stringify(cfg));
        await http_proxy_server.stop();

       // console.log(cli.stdout)
        let data = JSON.parse(cli.stdout);
        data = data.shift();
        expect(data.ip).to.eq('127.0.0.1');
        expect(data.port).to.eq(3128);
        expect(data.http.error).to.be.null;
        expect(data.https.error).to.not.be.null
    }

    @test
    async 'judge file with empty parameter'() {
        let cli = await SpawnCLI.run('judge-file');
        expect(cli.stderr).to.contain('cli.ts judge-file <file>');
        expect(cli.stderr).to.contain('--verbose, -v')
    }

    @test
    async 'judge file in usage'() {
        let cli = await SpawnCLI.run();
        expect(cli.stderr).to.contain('judge-file <file>')
    }

}