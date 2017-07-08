import * as mocha from 'mocha';
describe('', () => {
});


import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {IProxyServerOptions} from "../../src/server/IProxyServerOptions";
import {ProxyServer} from "../../src/server/ProxyServer";
import {JudgeFileCommand} from "../../src/commands/JudgeFileCommand";


/*
 import subscribe from "../../src/events/decorator/subscribe"
 import {ReqResEvent} from "../../src/judge/ReqResEvent";
 import LogEvent from "../../src/logging/LogEvent";
 import {EventBus} from "../../src/events/EventBus";

 class _Console {

 @subscribe(ReqResEvent)
 onReqRes(rre: ReqResEvent) {
 this.out(rre)
 }

 @subscribe(LogEvent)
 onLog(rre: LogEvent) {
 this.out(rre)
 }

 private out(o: LogEvent | ReqResEvent) {
 console.error(o.out())
 }
 }
 */


const cfg = {remote_lookup: false, selftest: false, judge_url: "http://127.0.0.1:8080"};

@suite('commands/JudgeFileCommand') @timeout(20000)
class JudgeFileCommandTest {


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

        let jfc = new JudgeFileCommand();
        let list = await jfc.handler({
            file: __dirname + '/../_files/proxylists/list01.csv',
            verbose: true,
            config: cfg,
            format: 'json'
        });
        await http_proxy_server.stop();
        //EventBus.unregister(c)

        let data = list.shift();
        expect(data.ip).to.eq('127.0.0.1');
        expect(data.port).to.eq(3128);

        expect(data.results.http.error).to.be.null;
        expect(data.results.https.error).to.not.be.null;
    }


}