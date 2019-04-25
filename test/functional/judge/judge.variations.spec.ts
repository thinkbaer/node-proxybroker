// process.env.NODE_DEBUG = 'request|tunnel'
// process.env.NODE_DEBUG = ' request tunnel node '
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import * as _ from "lodash";
import {suite, test} from "mocha-typescript";
import {expect} from "chai";

import * as http from 'http'
import * as https from 'https'
import {Log} from "@typexs/base";
import {TestHelper} from "../TestHelper";
import {Judge} from "../../../src/libs/judge/Judge";
import {ProxyServer} from "../../../src/libs/server/ProxyServer";
import {IProxyServerOptions} from "../../../src/libs/server/IProxyServerOptions";
import {IJudgeOptions} from "../../../src/libs/judge/IJudgeOptions";

// https://www.proxynova.com/proxy-articles/proxy-anonymity-levels-explained

const JUDGE_LOCAL_HOST: string = 'judge.local';
const PROXY_LOCAL_HOST: string = 'proxy.local';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * Test different variations of judge and proxy connections for different transparency levels
 *
 * judge <=> proxy
 * http - http
 * http - https
 * https - http
 * https - https
 *
 * Level description
 * + L1 - Elite Proxies (High Anonymity Proxies)
 * + L2 - Anonymous Proxies
 * + L3 - Transparent Proxies
 */


let debug = false;//true;

interface Variation {
  title: string
  proxy_options: {
    level: number
    key_file?: string
    cert_file?: string
  },
  debug: boolean


}

suite('Judge proxy variations', () => {
  let variations: Array<Variation> = [
    {
      title: 'Client <-> HTTP Proxy L3 <-> HTTP(S) Judge',
      proxy_options: {level: 3},
      debug: debug
    },
    {
      title: 'Client <-> HTTP Proxy L2 <-> HTTP(S) Judge',
      proxy_options: {level: 2},
      debug: debug
    },
    {
      title: 'Client <-> HTTP Proxy L1 <-> HTTP(S) Judge',
      proxy_options: {level: 1},
      debug: debug
    },
    {
      title: 'Client <-> HTTPS Proxy L1 <-> HTTP(S) Judge',
      proxy_options: {
        level: 1,
        key_file: TestHelper.sslPath('proxy/server-key.pem'),
        cert_file: TestHelper.sslPath('proxy/server-cert.pem'),
      },
      debug: debug
    },
    {
      title: 'Client <-> HTTPS Proxy L3 <-> HTTP(S) Judge',
      proxy_options: {
        level: 3,
        key_file: TestHelper.sslPath('proxy/server-key.pem'),
        cert_file: TestHelper.sslPath('proxy/server-cert.pem'),
      },
      debug: debug
    },
    {
      title: 'Client <-> HTTPS Proxy L2 <-> HTTP(S) Judge',
      proxy_options: {
        level: 2,
        key_file: TestHelper.sslPath('proxy/server-key.pem'),
        cert_file: TestHelper.sslPath('proxy/server-cert.pem'),
      },
      debug: debug
    },
    {
      title: 'Client <-> HTTPS Proxy L1 <-> HTTP(S) Judge',
      proxy_options: {
        level: 1,
        key_file: TestHelper.sslPath('proxy/server-key.pem'),
        cert_file: TestHelper.sslPath('proxy/server-cert.pem'),
      },
      debug: debug
    }
  ];

  variations.forEach((data) => {

    @suite(data.title)
    class Clazz {

      static proxy_port = 5008;
      static proxy_ip = PROXY_LOCAL_HOST;

      static proxy_protocol = (data.proxy_options.key_file && data.proxy_options.cert_file ? 'https' : 'http');

      static judge: Judge = null;
      static proxy_server: ProxyServer = null;

      static async before() {
        Log.options({enable: data.debug, level: 'debug'});


        let proxy_options:IProxyServerOptions = <IProxyServerOptions>_.assign({},{
          //url: this.proxy_protocol + '://' + this.proxy_ip + ':' + this.proxy_port,
          port: this.proxy_port,
          protocol: this.proxy_protocol,
          ip: this.proxy_ip,
          toProxy: false
        }, data.proxy_options);
        this.proxy_server = new ProxyServer();
        this.proxy_server.initialize(proxy_options);

        let opts: IJudgeOptions = {
          selftest: false,
          remote_lookup: false,
          remote_ip: JUDGE_LOCAL_HOST,
          ip: JUDGE_LOCAL_HOST,
          http_port: 8080,
          https_port: 8181,
          request: {
            local_ip: '127.0.0.1',
            //timeout: 1000
          }
        };

        this.judge = new Judge(opts);

        let erg = await this.judge.prepare();
        expect(erg).to.equal(true);

        erg = await this.judge.wakeup();
        expect(erg).to.equal(true);

        await this.proxy_server.start()
      }


      static async after() {
        await this.proxy_server.stop();
        await this.judge.pending();
        Log.enable = true;
        this.proxy_server = null;
        this.judge = null
      }


      @test
      async http_request() {

        let proxy_url = Clazz.proxy_server.url();
        let judgeReq = Clazz.judge.createRequest('http', proxy_url);
        judgeReq._debug = data.debug;

        try {
          let rrm = await judgeReq.performRequest();
          let log = rrm.logToString();

          if (judgeReq._debug) {
            console.log('-------->');
            console.log(log);
            console.log('<--------')
          }

          expect(judgeReq.level).to.be.equal(data.proxy_options.level);
          expect(log).to.match(/Judge connected/);
          expect(log).to.match(new RegExp('Proxy is L' + data.proxy_options.level))
        } catch (err) {
          console.error(err);
          throw err
        }
      }

      @test
      async https_request() {

        let proxy_url = Clazz.proxy_server.url();
        let judgeReq = Clazz.judge.createRequest('https', proxy_url);
        judgeReq._debug = data.debug;

        try {
          let rrm = await judgeReq.performRequest();
          let log = rrm.logToString();

          if (judgeReq._debug) {
            console.log('-------->');
            console.log(log);
            console.log('<--------')
          }

          // everything is level 1
          expect(judgeReq.level).to.be.equal(1);
          expect(log).to.match(/Judge connected/);
          expect(log).to.match(new RegExp('Proxy is L1'))
        } catch (err) {
          console.error(err);
          throw err
        }
      }
    }

  })

});

process.on('uncaughtException', function (err: Error) {
  console.log(err);
});
