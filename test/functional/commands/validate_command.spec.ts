import {suite, test, timeout} from 'mocha-typescript';
import {expect} from 'chai';
import {Config} from 'commons-config';

import {ProtocolType} from '../../../src/libs/specific/ProtocolType';
import {Log} from '@typexs/base';
import {IProxyServerOptions} from '../../../src/libs/server/IProxyServerOptions';
import {ProxyServer} from '../../../src/libs/server/ProxyServer';
import {ProxyValidateCommand} from '../../../src/commands/ProxyValidateCommand';
import {HttpFactory} from 'commons-http';


process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const stdMocks = require('std-mocks');

const cfg = {
  validator: {
    judge: {
      remote_lookup: false,
      selftest: false,
      ip: 'judge.local',
      remote_ip: 'judge.local',
      request: {
        local_ip: '127.0.0.1'
      }
    }
  }
};

@suite('commands/ValidateCommand') @timeout(20000)
class ValidateCommandTest {

  static async before() {
    Log.options({enable: true, level: 'debug'});
    await HttpFactory.load();
  }


  @test.skip
  async 'judge file with file'() {
    Config.clear();
    Config.jar().merge(cfg);

    const proxy_options: IProxyServerOptions = <IProxyServerOptions>{
      ip: '127.0.0.11',
      port: 3128,
      protocol: 'http',
      level: 3,
      toProxy: false
    };

    const http_proxy_server = new ProxyServer();
    http_proxy_server.initialize(proxy_options);
    await http_proxy_server.start();

    stdMocks.use();
    const proxyValidateCommand = new ProxyValidateCommand();
    const list = await proxyValidateCommand.handler({
      _resolve: true,
      url_or_file: __dirname + '/../_files/proxylists/list01.csv',
      verbose: false,
      // config: cfg, // config can be ignored handler work on cli.ts level, so we previously defined settings directly
      format: 'json'
    });
    stdMocks.restore();
    const output = stdMocks.flush();
    await http_proxy_server.stop();


    expect(output).to.have.keys('stdout', 'stderr');
    expect(output.stdout).has.length(1);
    expect(list).has.length(1);
    const stdData = JSON.parse(output.stdout[0]);
    expect(stdData[0]).to.deep.eq(JSON.parse(JSON.stringify(list[0].results)));

    const data = list.shift();
    expect(data.ip).to.eq('127.0.0.11');
    expect(data.port).to.eq(3128);

    const http_http = data.results.getVariant(ProtocolType.HTTP, ProtocolType.HTTP);
    const http_https = data.results.getVariant(ProtocolType.HTTP, ProtocolType.HTTPS);
    const https_http = data.results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTP);
    const https_https = data.results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTPS);

    expect(http_http.hasError()).to.be.false;
    expect(http_http.level).to.be.eq(3);
    expect(http_https.hasError()).to.be.false;
    expect(http_https.level).to.be.eq(1);
    expect(https_http.hasError()).to.be.true;
    expect(https_https.hasError()).to.be.true;

  }


}
