import {Judge} from "../../src/lib/judge";
let mlog = require('mocha-logger')
import * as assert from 'assert'
import * as chai from 'chai'
let expect = chai.expect
import {Log} from "../../src/lib/logging";
import * as HttpProxy from "http-proxy";
import * as http from 'http'
import * as url from "url";
import * as net from "net";
import {RequestResponseMonitor} from "../../src/lib/request_response_monitor";
import * as _request from "request-promise-native";


describe('Request Response Monitor', () => {


    describe('default server connection', () => {
        let server: net.Server = null

        before(function (done) {

            server = http.createServer(function (req: http.IncomingMessage, res: http.ServerResponse) {
                res.writeHead(200, {"Content-Type": "application/json"});
                var data = {time: (new Date()).getTime(), headers: req.headers, rawHeaders: req.rawHeaders}
                var json = JSON.stringify(data);
                res.end(json);
            }).listen(8000, '127.0.0.1', () => {

                done()
            })

        })

        after(function (done) {
            server.close(function () {
                done()
            })
        })


        it('simple request', async function () {
            let result = null
            let rrm = null

            try{
                let req = _request.get('http://127.0.0.1:8000')
                rrm = RequestResponseMonitor.monitor(req)
                result = await req.promise()
            }catch(err){
                console.log(err)
            }
            await rrm.promise()

            console.log('WAITED', result, rrm.log)
        })
    })


    describe('server abort through timeout', () => {

        let server: net.Server = null

        before(function (done) {

            server = http.createServer(function (req: http.IncomingMessage, res: http.ServerResponse) {
                setTimeout(function(){
                    res.writeHead(200, {"Content-Type": "application/json"});
                    var data = {time: (new Date()).getTime(), headers: req.headers, rawHeaders: req.rawHeaders}
                    var json = JSON.stringify(data);
                    res.end(json);
                },2000)
            }).listen(8000, '127.0.0.1', () => {
                done()
            })

        })

        after(function (done) {
            server.close(function () {
                done()
            })
        })


        it('timeout request', async function () {
            this.timeout(4000)

            let result = null
            let rrm = null

            try{
                let req = _request.get('http://127.0.0.1:8000',{timeout:500})
                rrm = RequestResponseMonitor.monitor(req)
                result = await req.promise()
            }catch(err){
                expect(err.name).to.be.equal('RequestError')
                expect(err.message).to.be.equal('Error: ESOCKETTIMEDOUT')
            }
            await rrm.promise()
            console.log('WAITED', result, rrm.log)

        })
    })
})

process.on('uncaughtException', function (err: Error) {
    console.log(err);
});