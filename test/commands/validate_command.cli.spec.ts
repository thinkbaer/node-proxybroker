import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";

import SpawnCLI from "./SpawnCLI";
import {IProxyServerOptions} from "../../src/server/IProxyServerOptions";
import {ProxyServer} from "../../src/server/ProxyServer";
import {Log} from "../../src/lib/logging/Log";

describe('', () => {
});


const cfg: any = {
    validator: {
        judge: {
            remote_lookup: false, selftest: false, judge_url: "http://127.0.0.1:8080"
        }
    }
};


@suite('commands/ValidateCommand - CLI version') @timeout(20000)
class CLIValidateCommandTest {

    static before() {
        Log.options({enable: false})
        SpawnCLI.timeout = 10000
    }


    @test
    async 'passed file'() {

        let proxy_options: IProxyServerOptions = Object.assign({}, {
            url: 'http://127.0.0.1:3128',
            level: 3,
            toProxy:false
        });

        let http_proxy_server = new ProxyServer(proxy_options);

        await http_proxy_server.start();
        let cli = await SpawnCLI.run('validate', 'test/_files/proxylists/list01.csv', '-v', '-c', JSON.stringify(cfg));
        await http_proxy_server.stop();

        // console.log(cli.stdout,cli.stderr)
        let data = JSON.parse(cli.stdout);
        data = data.shift();
        expect(data.ip).to.eq('127.0.0.1');
        expect(data.port).to.eq(3128);
        expect(data.http.error).to.be.null;
        expect(data.https.error).to.not.be.null
    }

    @test
    async 'no passed parameter'() {
        let cli = await SpawnCLI.run('validate');
        expect(cli.stderr).to.contain('cli.ts validate <host_or_file>');
        expect(cli.stderr).to.contain('--verbose, -v')
    }

    @test
    async 'usage'() {
        let cli = await SpawnCLI.run();
        expect(cli.stderr).to.contain('validate <host_or_file>')
    }

}