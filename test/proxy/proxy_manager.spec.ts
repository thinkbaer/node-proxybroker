// Reference mocha-typescript's global definitions:
/// <reference path="../../node_modules/mocha-typescript/globals.d.ts" />

import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {Judge} from "../../src/judge/Judge";
import {ProxyManager} from "../../src/proxy/ProxyManager";
import {Storage} from "../../src/storage/Storage";

const JUDGE_LOCAL_HOST: string = 'judge.local'
const PROXY_LOCAL_HOST: string = 'proxy.local'

@suite("Provider manager")
class PM {

    static _debug:boolean = true

    @test
    async validateFailOnAllProtocols(){
        let opts = {
            selftest: false,
            remote_lookup: false,
            debug: PM._debug,
            remote_url: 'http://' + JUDGE_LOCAL_HOST + ':8080',
            judge_url: 'http://' + JUDGE_LOCAL_HOST + ':8080',
            request:{
                timeout:500,
                local_ip:'127.0.0.1'
            }
        }

        let judge = new Judge(opts)
        await judge.bootstrap()
        let wakeup = await judge.wakeup()
        expect(wakeup).to.eq(true)

        let storage = new Storage()
        let pm = new ProxyManager(storage,judge);

        let validationResult = await pm.validate(PROXY_LOCAL_HOST,3128)


        wakeup = await judge.pending()
        expect(wakeup).to.eq(true)

    }

}

