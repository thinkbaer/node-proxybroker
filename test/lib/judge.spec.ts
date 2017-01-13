import * as http from 'http'
import {Judge} from "../../src/lib/judge";
import * as request from "request-promise";
import {Server} from "http";

let localip: string = null
let judge: Judge = null
let server: Server = null


describe('Judge', () => {

    before(function (done) {
        request.get('https://api.ipify.org?format=json')
            .then(function (data) {
                let json = JSON.parse(data)
                localip = json.ip
                console.log('myip=' + localip)
                done()
            })
    })

    before(function (done) {
        judge = new Judge();
        server = judge.app.listen(judge.self_port, judge.self_ip, function () {
            console.log('start server')
            done()
        })
    })

    it('server check', function (done) {
        let url = 'http://' + localip + ':' + judge.self_port + '/api/judge'
        judge.enable()
        let start = new Date()
        request.get(url)
            .then((r) => {
                var s = JSON.parse(r)
                var stop = new Date()
                var c_s = s.time - start.getTime()
                var s_c = stop.getTime() - s.time
                var full = stop.getTime() - start.getTime()
                console.log('Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full)
                done()
            }).catch(err=>done(err))
        /*
         let proxy = 'http://212.185.87.53:443'
         console.log('Try ' +'http://' + localip + ':'+judge.self_port+'/api/judge over ' + proxy)
         var r = request.defaults({proxy: proxy})
         return r.get('http://' + myip + ':8080/api/judge',{resolveWithFullResponse: true})
         */
    })

    it('server over telekom proxy', function (done) {
        // this.skip()
        this.timeout(20000)
        judge.enable()
        let proxy = 'http://212.185.87.53:443'
        let start = new Date()

        let url = 'http://' + localip + ':' + judge.self_port + '/api/judge'
        var r = request.defaults({proxy: proxy})
        r.get(url)
            .then((r) => {
                var s = JSON.parse(r)
                var stop = new Date()
                var c_s = s.time - start.getTime()
                var s_c = stop.getTime() - s.time
                var full = stop.getTime() - start.getTime()
                console.log('Time: C -> S: ' + c_s + ', S -> C: ' + s_c + ', G:' + full);
                done()
            })
            .catch(err=>done(err))
        //return r.get(url,{resolveWithFullResponse: true}).then
        /*
         let proxy = 'http://212.185.87.53:443'
         console.log('Try ' +'http://' + localip + ':'+judge.self_port+'/api/judge over ' + proxy)
         var r = request.defaults({proxy: proxy})
         return r.get('http://' + myip + ':8080/api/judge',{resolveWithFullResponse: true})
         */
    })

    after(function (done) {
        server.close(function () {
            console.log('shutdown server')
            done()
        })
    })
})