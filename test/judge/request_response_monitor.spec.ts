import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'

import {RequestResponseMonitor} from "../../src/judge/RequestResponseMonitor";
import * as _request from "request-promise-native";
import {Server} from "../../src/server/Server";
//import {DefaultHTTPServer, DefaultHTTPSServer} from "../helper/server";


//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

//https.globalAgent.options.rejectUnauthorized = false;
const PROXY_LOCAL_HOST: string = 'proxy.local'
const SSL_PATH = '../_files/ssl'
const DEBUG = false

@suite('judge/RequestResponseMonitor')
class ReqResMonitorTest {

    /**
     * Server abort scenarios
     */
    /**
     * Test serversite request abort
     */
    @test
    async 'server abort'() {
        let server: Server = new Server({url: 'http://localhost:8000'})
        await server.start()

        server.stall = 1000

        setTimeout(function () {
            server.forcedShutdown()
        }, 100)

        let _url = server.url()
        let req = _request.get(_url)
        let rrm = RequestResponseMonitor.monitor(req)
        rrm._debug = DEBUG

        try {
            await req.promise()
        } catch (err) {
            expect(err.message).to.match(new RegExp("socket hang up"))
        }
        await rrm.promise()

        let log: string = rrm.logToString()
        if (rrm._debug) {
            console.log('-------->')
            console.log(log)
            console.log('<--------')
        }
        expect(log).to.contain("Try connect to " + _url)
        expect(log).to.match(new RegExp("Connection aborted"))
        expect(log).to.match(new RegExp("socket hang up"))


        await server.stop()
    }

    /**
     * Server abort scenarios
     */
    /**
     * Test serversite request abort
     */
    @test
    async 'server timeout'() {
        let server: Server = new Server({url: 'http://127.0.0.1:8000', timeout: 100})

        await server.start()

        server.stall = 1000

        let _url = server.url()
        let req = _request.get(_url)
        let rrm = RequestResponseMonitor.monitor(req)
        rrm._debug = DEBUG
        try {
            await req.promise()
        } catch (err) {
            //expect(err.message).to.match(new RegExp("socket hang up"))
        }
        await rrm.promise()
        let log: string = rrm.logToString()

        if (rrm._debug) {
            console.log('-------->')
            console.log(log)
            console.log('<--------')
        }
        expect(log).to.contain("Try connect to " + _url)
        expect(log).to.match(new RegExp("Connection aborted"))
        expect(log).to.match(new RegExp("socket hang up"))
        await server.stop()
    }


    /**
     * Test simple request to the server
     */
    @test
    async    'http server simple request'() {

        let server: Server = new Server({url: 'http://127.0.0.1:8000', _debug: DEBUG})

        await server.start()

        let _url = server.url()
        let req = _request.get(_url)
        let rrm = RequestResponseMonitor.monitor(req)
        rrm._debug = DEBUG
        await req.promise()
        await rrm.promise()

        let log: string = rrm.logToString()

        if (rrm._debug) {
            console.log('-------->')
            console.log(log)
            console.log('<--------')

        }

        expect(log).to.contain("Try connect to " + _url)
        expect(log).to.match(new RegExp("set TCP_NODELAY"))
        expect(log).to.match(new RegExp("Received 285 byte from sender"))
        expect(log).to.match(new RegExp("Connection closed to " + _url + " \\(\\d+ms\\)"))

        await         server.stop()
    }

    /**
     * Test Socket timeout exception handling, should be written in the log
     */
    @test
    async 'http server socket timeout request'() {

        let server: Server = new Server({url: 'http://127.0.0.1:8000', _debug: DEBUG})

        await server.start()

        // this.timeout(server.stall)
        let result = null
        let rrm = null
        try {
            server.stall = 500
            let req = _request.get(server.url(), {timeout: 100})
            rrm = RequestResponseMonitor.monitor(req)
            result = await req.promise()
            server.stall = 0
        } catch (err) {
            expect(err.name).to.be.equal('RequestError')
            expect(err.message).to.be.equal('Error: ESOCKETTIMEDOUT')
        }

        await rrm.promise()

        let log: string = rrm.logToString()
        /*
         console.log('-------->')
         console.log(log)
         console.log('<--------')
         */
        expect(log).to.match(new RegExp("ESOCKETTIMEDOUT"))
        expect(log).to.match(new RegExp("Socket timed out after \\d+ms"))
        await         server.stop()

    }


    /**
     * Test server socket timeout exception handling
     *
     * TODO!!!
     */
    @test
    async 'https server socket timeout request encrypted request'() {

        let server: Server = new Server({
            url: 'https://' + PROXY_LOCAL_HOST + ':8000',
            key_file: __dirname + '/' + SSL_PATH + '/proxy/server-key.pem',
            cert_file: __dirname + '/' + SSL_PATH + '/proxy/server-cert.pem',
        })

        await server.start()

        let options = {ca: server._options.cert}

        // let suuid = shorthash('https://127.0.0.1:8000/judge' + (new Date().getTime()))

        //_request.debug = true
        let req = _request.get(server.url() + '/judge/DUMMY', options)
        //let req = _request.get('https://www.google.de?')
        let rrm = RequestResponseMonitor.monitor(req)
        // rrm._debug = true
        let result = await req.promise()

        await rrm.promise()
        let log: string = rrm.logToString()

        expect(log).to.match(new RegExp("Try handshake for secure connetion"))
        expect(log).to.match(new RegExp("Secured connection established \\(\\d+ms\\)"))
        // expect(log).to.not.match(new RegExp(""))

        /*
         console.log('==== LS ====>\n' + rrm.logToString() + '\n<============\n')
         console.log(rrm.headers_request, rrm.headers_response, result)
         */
        await server.stop()
    }

    /**
     * Test when server is not reachable or doesn't exists
     */
    @test
    async 'server not reachable - http request'() {

        let result = null
        let rrm = null
        try {
            let req = _request.get('http://127.0.0.1:12345', {timeout: 1000})
            rrm = RequestResponseMonitor.monitor(req)
            // rrm._debug = true
            result = await req.promise();
        } catch (err) {
            expect(err.message).to.match(new RegExp("Error: connect ECONNREFUSED 127.0.0.1:12345"))
        }

        await rrm.promise();

        let log: string = rrm.logToString()
        /*
         console.log('-------->')
         console.log(log)
         console.log('<--------')
         */
        expect(rrm.connected).to.be.false

        expect(log).to.match(new RegExp("Connection aborted through errors"))
        expect(log).to.match(new RegExp("connect ECONNREFUSED 127.0.0.1:12345"))
        expect(log).to.match(new RegExp("Connection not established"))
    }


    /**
     * Test when server is not reachable or doesn't exists
     */
    @test
    async 'server not reachable - https request'() {
        let result = null
        let rrm = null
        try {
            let req = _request.get('https://127.0.0.1:12345', {timeout: 1000})
            rrm = RequestResponseMonitor.monitor(req)
            //              rrm._debug = true
            result = await req.promise()
        } catch (err) {
            expect(err.message).to.match(new RegExp("Error: connect ECONNREFUSED 127.0.0.1:12345"))
        }

        await rrm.promise()

        let log: string = rrm.logToString()
        /*
         console.log('-------->')
         console.log(log)
         console.log('<--------')
         */
        expect(rrm.connected).to.be.false

        expect(log).to.match(new RegExp("Connection aborted through errors"))
        expect(log).to.match(new RegExp("connect ECONNREFUSED 127.0.0.1:12345"))
        expect(log).to.match(new RegExp("Connection not established"))
    }

}

process.on('uncaughtException', function (err: Error) {
    console.log(err);
});