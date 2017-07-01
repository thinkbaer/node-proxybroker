import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'
import {ProxyValidationController} from "../../src/proxy/ProxyValidationController";
import {IProxyServerOptions} from "../../src/server/IProxyServerOptions";
import {ProxyServer} from "../../src/server/ProxyServer";
import {IJudgeOptions} from "../../src/judge/IJudgeOptions";
import {ProxyDataValidateEvent} from "../../src/proxy/ProxyDataValidateEvent";
import {ProxyData} from "../../src/proxy/ProxyData";

const proxy_options : IProxyServerOptions = Object.assign({}, {
    url: 'http://127.0.0.1:3128',
    level: 3
})

const judge_options : IJudgeOptions = {
    remote_lookup: false,
    selftest: false,
    judge_url: "http://127.0.0.1:8080"
}

@suite('proxy/ProxyValidationController') @timeout(10000)
class ProxyValidationControllerTest {

    @test
    async 'validation'() {

        let http_proxy_server = new ProxyServer(proxy_options)
        let proxyValidationController = new ProxyValidationController(judge_options)

        await proxyValidationController.prepare()

        await http_proxy_server.start()

        let proxyData = new ProxyData({ip:'127.0.0.1',port:3128})
        let e = new ProxyDataValidateEvent(proxyData)

        let event:ProxyDataValidateEvent = await proxyValidationController.validate(e)

        // await proxyValidationController.await()
        await proxyValidationController.shutdown()
        await http_proxy_server.stop()

        expect(event.data.results).to.exist
        expect(event.data.results.http).to.exist
        expect(event.data.results.https).to.exist
        expect(event.data.results.http).to.deep.include({
            error:null,
            level:3
        })


    }
}