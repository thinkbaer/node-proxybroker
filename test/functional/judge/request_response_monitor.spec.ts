import {suite, test} from "mocha-typescript";
import {expect} from "chai";

//import * as _request from "request-promise-native";
import {Log} from "@typexs/base";
import {Server} from "@typexs/server";
import {RequestResponseMonitor} from "../../../src/libs/judge/RequestResponseMonitor";
import {TestHelper} from "../TestHelper";
import {HttpGotAdapter} from "../../../src/adapters/http/got/HttpGotAdapter";
import {IHttp, isStream} from "../../../src/libs/http/IHttp";

//process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

//https.globalAgent.options.rejectUnauthorized = false;
const PROXY_LOCAL_HOST: string = 'proxy.local';
//const SSL_PATH = '../_files/ssl';
const DEBUG = false;

// Log.options({enable:true,level:'debug'})
let http: IHttp = null;

@suite('judge/RequestResponseMonitor')
class ReqResMonitorTest {

  static before() {
    Log.options({enable: DEBUG, level: 'debug'});
    http = new HttpGotAdapter();
  }

  /**
   * Server abort scenarios
   */
  /**
   * Test serversite request abort
   */
  @test
  async 'server abort'() {
    let server: Server = new Server();
    server.initialize({ip: 'localhost', port: 8000, protocol: 'http'});
    await server.start();

    server.stall = 1000;

    setTimeout(() => {
      Log.debug('force shutdown server')
      server.shutdown()
    }, 100);

    let _url = server.url();
    //let req = _request.get(_url);

    let req = http.get(_url, {retry: 0});
    if (isStream(req)) {
      throw new Error('is stream');
    }

    let rrm = new RequestResponseMonitor(_url, null, req);
    //rrm._debug = DEBUG;

    try {
      await req;
    } catch (err) {
      expect(err.message).to.match(new RegExp("socket hang up"))
    }
    await rrm.promise();

    let log: string = rrm.logToString();
    /*
            if (rrm._debug) {
                console.log('-------->');
                console.log(log);
                console.log('<--------')
            }
            */
    expect(log).to.contain("Try connect to " + _url);
    expect(log).to.match(new RegExp("Connection aborted"));
    expect(log).to.match(new RegExp("socket hang up"));


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
    let server: Server = new Server();
    server.initialize({ip: 'localhost', port: 8000, protocol: 'http', timeout: 100});

    await server.start();

    server.stall = 1000;

    let _url = server.url();


    let req = http.get(_url);
    if (isStream(req)) {
      throw new Error('not a stream');
    }

    //let req = _request.get(_url);
    let rrm = new RequestResponseMonitor(_url, null, req);
    //rrm._debug = DEBUG;
    try {
      await req
    } catch (err) {
      //expect(err.message).to.match(new RegExp("socket hang up"))
    }
    await rrm.promise();
    let log: string = rrm.logToString();
    /*
            if (rrm._debug) {
                console.log('-------->');
                console.log(log);
                console.log('<--------')
            }
            */
    expect(log).to.contain("Try connect to " + _url);
    expect(log).to.match(new RegExp("Connection aborted"));
    expect(log).to.match(new RegExp("socket hang up"));
    await server.stop()
  }


  /**
   * Test simple request to the server
   */
  @test
  async 'http server simple request'() {

    let server: Server = new Server();
    server.initialize({ip: 'localhost', port: 8000, protocol: 'http', _debug: DEBUG});

    await server.start();

    let _url = server.url();

    let req = http.get(_url);
    if (isStream(req)) {
      throw new Error('not a stream');
    }

    //let req = _request.get(_url);
    let rrm = new RequestResponseMonitor(_url, null, req, 'test');

    await req;
    await rrm.promise();

    let log: string = rrm.logToString();

    expect(log).to.contain("Try connect to " + _url);
    expect(log).to.match(new RegExp("set TCP_NODELAY"));
    expect(log).to.match(new RegExp("Received \\d+ byte from sender"));
    expect(log).to.match(new RegExp("Connection closed to " + _url + "\\/ \\(\\d+ms\\)"));

    await server.stop()
  }

  /**
   * Test simple request to the server
   */
  @test
  async 'https server simple request'() {

    let server: Server = new Server();
    server.initialize({
      ip: 'localhost', port: 8084, protocol: 'https',
      key_file: TestHelper.sslPath('proxy/server-key.pem'),
      cert_file: TestHelper.sslPath('proxy/server-cert.pem'),
    });

    await server.start();

    let _url = server.url();

    let req = http.get(_url, {rejectUnauthorized: false});
    if (isStream(req)) {
      throw new Error('not a stream');
    }

    //let req = _request.get(_url);
    let rrm = new RequestResponseMonitor(_url, null, req, 'test_ssl');

    await req;
    await rrm.promise();

    let log: string = rrm.logToString();

    expect(log).to.contain("Try connect to " + _url);
    expect(log).to.match(new RegExp("set TCP_NODELAY"));
    expect(log).to.match(new RegExp("Received \\d+ byte from sender"));
    expect(log).to.match(new RegExp("Connection closed to " + _url + "\\/ \\(\\d+ms\\)"));

    await server.stop()
  }

  /**
   * Test Socket timeout exception handling, should be written in the log
   */
  @test
  async 'http server socket timeout request'() {

    let server: Server = new Server();
    server.initialize({ip: 'localhost', port: 8000, protocol: 'http', _debug: DEBUG});

    await server.start();

    // this.timeout(server.stall)
    let result = null;
    let rrm = null;
    try {
      server.stall = 500;
      let _url = server.url();
      let opts = {timeout: 100, retry: 0};
      let req = http.get(_url, opts);
      if (isStream(req)) {
        throw new Error('not a stream');
      }
      //let req = _request.get(server.url(), {timeout: 100});
      rrm = new RequestResponseMonitor(_url, opts, req);
      result = await req;
      server.stall = 0
    } catch (err) {
      expect(err.name).to.be.equal('TimeoutError');
      expect(err.message).to.be.equal('Timeout awaiting \'request\' for 100ms')
    }

    await rrm.promise();

    let log: string = rrm.logToString();
    /*
     console.log('-------->')
     console.log(log)
     console.log('<--------')
     */
    expect(log).to.match(new RegExp("Timeout awaiting 'request' for 100ms"));
    //expect(log).to.match(new RegExp('Timeout awaiting \'request\' for 100ms'));
    await server.stop()

  }


  /**
   * Test server socket timeout exception handling
   *
   * TODO!!!
   */
  @test
  async 'https server socket timeout request encrypted request'() {

    let server: Server = new Server();
    server.initialize({
      ip: PROXY_LOCAL_HOST, port: 8000, protocol: 'https',
      key_file: TestHelper.sslPath('proxy/server-key.pem'),
      cert_file: TestHelper.sslPath('proxy/server-cert.pem'),
    });

    await server.start();

    let options = {ca: server._options.cert};

    // let suuid = shorthash('https://127.0.0.1:8000/judge' + (new Date().getTime()))

    //_request.debug = true
    let _url = server.url();
    let opts = {timeout: 100, ca: server._options.cert}
    let req = http.get(_url, opts);
    if (isStream(req)) {
      throw new Error('not a stream');
    }

//    let req = _request.get(server.url() + '/judge/DUMMY', options);
    //let req = _request.get('https://www.google.de?')
    let rrm = new RequestResponseMonitor(_url, opts, req);
    // rrm._debug = true
    let result = await req;

    await rrm.promise();
    let log: string = rrm.logToString();

    expect(log).to.match(new RegExp("Try handshake for secure connetion"));
    expect(log).to.match(new RegExp("Secured connection established \\(\\d+ms\\)"));
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

    let result = null;
    let rrm = null;
    try {
      let _url = 'http://127.0.0.1:12345';
      let opts = {timeout: 1000, retry: 0};
      let req = http.get(_url, opts);
      if (isStream(req)) {
        throw new Error('not a stream');
      }
//      let req = _request.get('http://127.0.0.1:12345', {timeout: 1000});
      rrm = new RequestResponseMonitor(_url, opts, req);
      // rrm._debug = true
      result = await req;
    } catch (err) {
      expect(err.message).to.match(new RegExp("connect ECONNREFUSED 127.0.0.1:12345"))
    }

    await rrm.promise();

    let log: string = rrm.logToString();
    /*
     console.log('-------->')
     console.log(log)
     console.log('<--------')
     */
    expect(rrm.connected).to.be.false;

    expect(log).to.match(new RegExp("Connection aborted through errors"));
    expect(log).to.match(new RegExp("connect ECONNREFUSED 127.0.0.1:12345"));
    expect(log).to.match(new RegExp("Connection not established"))
  }


  /**
   * Test when server is not reachable or doesn't exists
   */
  @test
  async 'server not reachable - https request'() {
    let result = null;
    let rrm = null;
    try {
      let _url = 'http://127.0.0.1:12345';
      let opts = {timeout: 1000, retry: 0};
      let req = http.get(_url, opts);
      if (isStream(req)) {
        throw new Error('not a stream');
      }
//      let req = _request.get('https://127.0.0.1:12345', {timeout: 1000});
      rrm = new RequestResponseMonitor(_url, opts, req);
      //              rrm._debug = true
      result = await req;
    } catch (err) {
      expect(err.message).to.match(new RegExp("connect ECONNREFUSED 127.0.0.1:12345"))
    }

    await rrm.promise();

    let log: string = rrm.logToString();
    /*
     console.log('-------->')
     console.log(log)
     console.log('<--------')
     */
    expect(rrm.connected).to.be.false;

    expect(log).to.match(new RegExp("Connection aborted through errors"));
    expect(log).to.match(new RegExp("connect ECONNREFUSED 127.0.0.1:12345"));
    expect(log).to.match(new RegExp("Connection not established"))
  }

}

