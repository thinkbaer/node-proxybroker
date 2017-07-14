import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {IProxyServerOptions} from "../../src/server/IProxyServerOptions";
import {ProxyServer} from "../../src/server/ProxyServer";
import {JudgeFileCommand} from "../../src/commands/JudgeFileCommand";
import {Log} from "../../src/lib/logging/Log";


let stdMocks = require('std-mocks');

const cfg = {remote_lookup: false, selftest: false, judge_url: "http://127.0.0.1:8080"};

@suite('commands/JudgeFileCommand') @timeout(20000)
class JudgeFileCommandTest {

    static before(){
        Log.options({enable:false})
    }


    @test
    async 'judge file with file'() {
        // Log.enable = true
        //let c = new _Console()
        //EventBus.register(c)

        let proxy_options: IProxyServerOptions = Object.assign({}, {
            url: 'http://127.0.0.1:3128',
            level: 3
        });

        let http_proxy_server = new ProxyServer(proxy_options);

        await http_proxy_server.start();

        stdMocks.use();
        let jfc = new JudgeFileCommand();
        let list = await jfc.handler({
            file: __dirname + '/../_files/proxylists/list01.csv',
            verbose: false,
            config: cfg,
            format: 'json'
        });
        stdMocks.restore()
        let output = stdMocks.flush()
        await http_proxy_server.stop();
        //EventBus.unregister(c)

        expect(output).to.have.keys('stdout','stderr')
        expect(output.stdout).has.length(1)
        expect(list).has.length(1)
        let stdData = JSON.parse(output.stdout[0])
        expect(stdData[0]).to.deep.eq(JSON.parse(JSON.stringify(list[0].results)))
        let data = list.shift();
        expect(data.ip).to.eq('127.0.0.1');
        expect(data.port).to.eq(3128);

        expect(data.results.http.error).to.be.null;
        expect(data.results.https.error).to.not.be.null;
    }


}