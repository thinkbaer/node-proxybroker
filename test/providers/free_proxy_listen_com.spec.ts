import * as assert from 'assert'

// import FreeProxyLists_Com from "../../src/providers/free_proxy_lists.com";
import {anonJob} from "../../src/providers/free_proxy_lists.com";
import {API} from "../../src/module";

/*
class MockAPI implements API {
    count: number = 0

    enqueue(ip: string, port: string|number, flags: number = 0) {

        ip = ip.trim()
        if (!ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
            throw new Error('Wrong format of IP "' + ip + '"')
        }

        if (typeof port !== 'number') {
            port = parseInt(port)
        }

        if (1 > port || port > 65535) {
            throw new Error('port ot of range ' + port)
        }

        this.count++

        console.log('Okay', ip, port, flags)
    }
}


describe('Proxy provider: freeproxylisten.com tests', () => {


    it('test anon job', function (done) {
        let _API = new MockAPI()

        anonJob(_API)
            .then(() => {
                assert.equal(_API.count > 1000, true)
                done()
            })
            .catch((err: Error) => done(err))


    })


})
*/