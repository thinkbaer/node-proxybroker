import * as net from 'net';
import {suite, test, timeout} from 'mocha-typescript';
import {expect} from 'chai';
import {Log, NestedException} from '@typexs/base';
import {ProxyServer} from '../../../src/libs/server/ProxyServer';
import {Judge} from '../../../src/libs/judge/Judge';
import {IProxyServerOptions} from '../../../src/libs/server/IProxyServerOptions';
import {TestHelper} from '../TestHelper';
import {ProtocolType} from '../../../src/libs/specific/ProtocolType';
import {RequestResponseMonitor} from '../../../src/libs/judge/RequestResponseMonitor';
import {JudgeResults} from '../../../src/libs/judge/JudgeResults';
import {HttpFactory} from 'commons-http';
import {IJudgeOptions} from '../../../src/libs/judge/IJudgeOptions';

const JUDGE_LOCAL_HOST = 'judge.local';
const PROXY_LOCAL_HOST = 'proxy.local';

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

@suite('judge/validations')
class JV {

  static server_wrapper: net.Server = null;

  static proxy_wrapper_port = 3456;

  static http_proxy_port = 5008;
  static http_proxy_ip: string = PROXY_LOCAL_HOST;
  static http_proxy_server: ProxyServer = null;

  static https_proxy_port = 6009;
  static https_proxy_ip: string = PROXY_LOCAL_HOST;
  static https_proxy_server: ProxyServer = null;

  static judge: Judge = null;

  static async before() {
    await HttpFactory.load();
    // Log.options({enable: JV._debug, level:'debug'});
    Log.options({enable: false, level: 'debug', loggers: [{name: '*', enable: false, level: 'debug'}]});
    const proxy_options: IProxyServerOptions = <IProxyServerOptions>{
      // url: 'http://' + JV.http_proxy_ip + ':' + JV.http_proxy_port,
      protocol: 'http',
      ip: JV.http_proxy_ip,
      port: JV.http_proxy_port,
      level: 3,
      toProxy: false
    };
    JV.http_proxy_server = new ProxyServer();
    JV.http_proxy_server.initialize(proxy_options);

    const proxy_options2: IProxyServerOptions = <IProxyServerOptions>{
//            url: 'https://' + JV.https_proxy_ip + ':' + JV.https_proxy_port,
      protocol: 'https',
      ip: JV.https_proxy_ip,
      port: JV.https_proxy_port,
      level: 3,
      key_file: TestHelper.sslPath('proxy/server-key.pem'),
      cert_file: TestHelper.sslPath('proxy/server-cert.pem'),
      toProxy: false
    };
    JV.https_proxy_server = new ProxyServer();
    JV.https_proxy_server.initialize(proxy_options2);

    const opts: IJudgeOptions = {
      selftest: false,
      remote_lookup: false,
      remote_ip: JUDGE_LOCAL_HOST,
      ip: JUDGE_LOCAL_HOST,
      http_port: 8080,
      https_port: 8181,
      // remote_url: 'http://' + JUDGE_LOCAL_HOST + ':8080',
      // judge_url: 'http://' + JUDGE_LOCAL_HOST + ':8080',
      request: {
        timeout: 500,
        local_ip: '127.0.0.1'
      }
    };

    JV.judge = new Judge(opts);

    let erg = await JV.judge.prepare();
    expect(erg).to.equal(true);

    erg = await JV.judge.wakeup();
    expect(erg).to.equal(true);

    // Wraps between HTTP and HTTPS proxy
    JV.server_wrapper = net.createServer(function (conn: net.Socket) {
      conn.once('data', function (buf: Buffer) {
        // A TLS handshake record starts with byte 22.
        const address: number = (buf[0] === 22) ? JV.https_proxy_port : JV.http_proxy_port;
        const proxy = net.createConnection(address, PROXY_LOCAL_HOST, function () {
          proxy.write(buf);
          conn.pipe(proxy).pipe(conn);
        });

        conn.on('error', err => Log.error('conn', err));
        proxy.on('error', err => Log.error('proxy', err));
      });
    }).listen(JV.proxy_wrapper_port);

    await JV.http_proxy_server.start();
    await JV.https_proxy_server.start();
  }


  static async after() {
    await JV.http_proxy_server.stop();
    await JV.https_proxy_server.stop();

    try {
      await JV.judge.pending();
      await new Promise<void>(function (resolve) {
        JV.server_wrapper.close(function () {
          resolve();
        });
      });
    } catch (e) {
      Log.error(e);
    }
    JV.http_proxy_server = null;
    JV.https_proxy_server = null;
    JV.judge = null;
  }


  @test
  async 'tunnel https through http proxy'() {
    const proxy_url_http = 'http://' + JV.http_proxy_ip + ':' + JV.http_proxy_port;

    const judgeReq = JV.judge.createRequest('https', proxy_url_http); // , {local_ip: '127.0.0.1'}
    const rrm = await judgeReq.performRequest();
    const log = rrm.logToString();
    expect(log).to.match(/Judge connected/);
  }


  @test
  async 'tunnel https through http proxy (use handle)'() {
    const judgeReq = await JV.judge.handleRequest(JV.http_proxy_ip, JV.http_proxy_port, ProtocolType.HTTP, ProtocolType.HTTPS);
    expect(judgeReq.hasError).to.be.false;
  }

  @test
  async 'tunnel http through http proxy (use handle)'() {
    const judgeReq = await JV.judge.handleRequest(JV.http_proxy_ip, JV.http_proxy_port, ProtocolType.HTTP, ProtocolType.HTTP);
    expect(judgeReq.hasError).to.be.false;
  }

  @test
  async 'tunnel http through https proxy (use handle)'() {
    const judgeReq = await JV.judge.handleRequest(JV.https_proxy_ip, JV.https_proxy_port, ProtocolType.HTTPS, ProtocolType.HTTP);
    expect(judgeReq.hasError).to.be.false;
  }

  @test
  async 'tunnel https through https proxy (use handle)'() {
    const judgeReq = await JV.judge.handleRequest(JV.https_proxy_ip, JV.https_proxy_port, ProtocolType.HTTPS, ProtocolType.HTTPS);
    expect(judgeReq.hasError).to.be.false;
  }

  @test.skip()
  async 'TODO: socket timeout on https judge request'() {
    /*
    StdConsole.$enabled = true
    Log.enable = true
    EventBus.register(new StdConsole())
    */
    const proxy_url_https = 'https://' + JV.http_proxy_ip + ':' + JV.http_proxy_port;
    const judgeReq = JV.judge.createRequest(proxy_url_https, '', {
      local_ip: '127.0.0.1',
      timeout: 500
    });
    const rrm: RequestResponseMonitor = await judgeReq.performRequest();
    const err = rrm.lastError();
    expect(err instanceof NestedException).to.be.true;
    // expect(err.code).to.be.eq('SOCKET_TIMEDOUT')
    expect(err.code).to.be.eq('SOCKET_HANGUP');
  }


  @test
  async validateFailedOnHttpAndHttps() {
    const results: JudgeResults = await JV.judge.validate(PROXY_LOCAL_HOST, 3130);

    for (const res of results.getVariants()) {
      expect(res.hasError).to.be.true;
    }
  }


  @test
  async validateSuccessOnHttpAndFailedOnHttps() {
    const results: JudgeResults = await JV.judge.validate(PROXY_LOCAL_HOST, JV.http_proxy_port);

    const http_http = results.getVariant(ProtocolType.HTTP, ProtocolType.HTTP);
    const http_https = results.getVariant(ProtocolType.HTTP, ProtocolType.HTTPS);
    const https_http = results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTP);
    const https_https = results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTPS);

    expect(http_http.hasError).to.be.false;
    expect(http_https.hasError).to.be.false;
    expect(https_http.hasError).to.be.true;
    expect(https_https.hasError).to.be.true;

    expect(http_http.level).to.eq(3);
    expect(http_https.level).to.eq(1);
  }


  @test
  async validateFailedOnHttpAndSuccessOnHttps() {
    // Log.options({enable:true,level:'debug'})
    const results: JudgeResults = await JV.judge.validate(PROXY_LOCAL_HOST, JV.https_proxy_port/*,{http:true,https:true}*/);

    results.getVariants();

    const http_http = results.getVariant(ProtocolType.HTTP, ProtocolType.HTTP);
    const http_https = results.getVariant(ProtocolType.HTTP, ProtocolType.HTTPS);
    const https_http = results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTP);
    const https_https = results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTPS);

    expect(http_http.hasError).to.be.true;
    expect(http_https.hasError).to.be.true;
    expect(https_http.hasError).to.be.false;
    expect(https_https.hasError).to.be.false;

    expect(https_http.level).to.eq(3);
    expect(https_https.level).to.eq(1);
  }


  @test
  async validateSuccessOnHttpAndHttps() {

    let results: JudgeResults;
    try {
      results = await JV.judge.validate(PROXY_LOCAL_HOST, JV.proxy_wrapper_port);
    } catch (e) {
      Log.error(e);
    }

    const http_http = results.getVariant(ProtocolType.HTTP, ProtocolType.HTTP);
    const http_https = results.getVariant(ProtocolType.HTTP, ProtocolType.HTTPS);
    const https_http = results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTP);
    const https_https = results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTPS);

    expect(http_http.hasError).to.be.false;
    expect(http_https.hasError).to.be.false;
    expect(https_http.hasError).to.be.false;
    expect(https_https.hasError).to.be.false;

    expect(http_http.level).to.eq(3);
    expect(http_https.level).to.eq(1);
    expect(https_http.level).to.eq(3);
    expect(https_https.level).to.eq(1);
  }

}
