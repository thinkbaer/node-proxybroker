var assert = require('assert');
var ProviderClass = require('./../../dist/providers/proxy_listen.de').default


describe('Test Provider: ProxyListenDe', function () {


    let instance = new ProviderClass()

    it('#init (with promise)', function (done) {

        instance
            .init()
            .then(function () {
                assert.equal(true, instance._hasNext)
                assert.equal(11, Object.keys(instance.form_data).length)
                done()
            })
            .catch(function (err) {
                done(err)
            })

    });

    it('fetch test 1', function (done) {
        this.timeout(10000)
        let size = 50
        instance
            .init({override: {filter_timeouts1: '', proxies: size +''}})
            .then(_r => {
                return instance.hasNext()
            })
            .then(function (hasNext) {
                assert.equal(true, hasNext)
                return instance.next()
            })
            .then(function (proxies) {
                assert.equal(size, proxies.size)
                return instance.hasNext()
            })
            .then(function (hasNext) {
                assert.equal(true, hasNext)
                return instance.next()
            })
            .then(function () {
                done()
            })
            .catch(function (err) {
                done(err)
            })
    });

    it('fetch test 2', function (done) {
        this.timeout(10000)
        instance
            .init({override: {filter_timeouts1: '10', filter_country: 'AF'}})
            .then(_r => {
                return instance.hasNext()
            })
            .then(function (hasNext) {
                assert.equal(true, hasNext)
                return instance.next()
            })
            .then(function (proxies) {
                assert.equal(0, proxies.size)
                return instance.hasNext()
            })
            .then(function (hasNext) {
                assert.equal(false, hasNext)
                return instance.next()
            })
            .then(function () {
                done()
            })
            .catch(function (err) {
                done(err)
            })

    });

    function fetcher(instance, proxies_all, limit = 10) {
        return instance.hasNext()
            .then(function (hasNext) {
                if(hasNext){
                    return instance.next()
                }
                return null
            })
            .then(function (proxies) {

                if(proxies){
                    proxies.forEach(_x =>
                        proxies_all.add(_x)
                    )
                    console.log('s=' + proxies.size,proxies_all.size)
                    if(limit > 0){
                        limit--
                        return fetcher(instance,proxies_all,limit);
                    }
                }else{
                    return proxies_all
                }
            })
    }

    it('fetch test 3', function (done) {

        let size = 300
        this.timeout(10000)
        let proxies_all = new Set()
        instance
            .init({override: {filter_timeouts1: '30', filter_country: '', proxies: size + ''}})
            .then(_r => {
                return fetcher(instance,proxies_all,5)
            })
            .then(function (proxies) {
                let arr = []
                proxies_all.forEach(_x => {
                    let entry = _x.addr + ':' + _x.port
                    if(arr.indexOf(entry) == -1){
                        arr.push(entry)
                    }
                })
                console.log(arr.length,proxies_all.size)
                assert.equal(6* 50, arr.length)

            })
            .then(function () {
                done()
            })
            .catch(function (err) {
                done(err)
            })

    });

});