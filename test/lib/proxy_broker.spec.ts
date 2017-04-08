import * as assert from 'assert'
import ProxyBroker from "../../src/lib/proxy_broker";


xdescribe('ProxyBroker', () => {

    let PB: ProxyBroker = null


    before(function () {
        PB = ProxyBroker.getInstance()
    })


    it('config', function (done) {
        PB.config({db_source: ':memory:'})
            .then(function (_PB: ProxyBroker) {
                PB = _PB
                done()
            })
            .catch(function (err:Error) {
                done(err)
            })
    })

    it('bootstrap', function (done) {
        PB.bootstrap()
            .then(function (_PB: ProxyBroker) {
                PB = _PB
                done()
            })
            .catch(function (err:Error) {
                done(err)
            })
    })

    it('add proxy', function (done) {
        this.skip()

        var Instance = ProxyBroker.getInstance()
        var proxy1 = Instance.addProxy({ip: '127.0.0.1', port: 9999})
        var proxy2 = Instance.addProxy({ip: '127.0.0.1', port: 8888})


        done()
    })


})
