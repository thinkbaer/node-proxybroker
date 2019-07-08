import {suite, test, timeout} from "mocha-typescript";
import {expect} from "chai";
import {Config} from "commons-config";

import {ProtocolType} from "../../src/libs/specific/ProtocolType";
import {Log} from "@typexs/base";
import {IProxyServerOptions} from "../../src/libs/server/IProxyServerOptions";
import {ProxyServer} from "../../src/libs/server/ProxyServer";
import {ProxyValidateCommand} from '../../src/commands/ProxyValidateCommand';

describe('', () => {
});


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
let stdMocks = require('std-mocks');

const cfg = {
  validator: {
    judge: {
      remote_lookup: false,
      selftest: false,
      ip: "judge.local",
      remote_ip: 'judge.local',
      request: {
        local_ip: '127.0.0.1'
      }
    }
  }
};

@suite('commands/ValidateCommand') @timeout(20000)
class ValidateCommandTest {

  static before() {
    Log.options({enable: false, level: 'debug'})
  }

  @test
  async 'judge file with file'() {
    Config.clear();
    Config.jar().merge(cfg);

    let proxy_options: IProxyServerOptions = <IProxyServerOptions>{
      ip: '127.0.0.11',
      port: 3128,
      protocol: 'http',
      level: 3,
      toProxy: false
    };

    let http_proxy_server = new ProxyServer();
    http_proxy_server.initialize(proxy_options);
    await http_proxy_server.start();

    stdMocks.use();
    let jfc = new ProxyValidateCommand();
    let list = await jfc.handler({
      _resolve: true,
      host_or_file: __dirname + '/../_files/proxylists/list01.csv',
      verbose: false,
      // config: cfg, // config can be ignored handler work on cli.ts level, so we previously defined settings directly
      format: 'json'
    });
    stdMocks.restore();
    let output = stdMocks.flush();
    await http_proxy_server.stop();


    expect(output).to.have.keys('stdout', 'stderr');
    expect(output.stdout).has.length(1);
    expect(list).has.length(1);
    let stdData = JSON.parse(output.stdout[0]);
    expect(stdData[0]).to.deep.eq(JSON.parse(JSON.stringify(list[0].results)));

    let data = list.shift();
    expect(data.ip).to.eq('127.0.0.11');
    expect(data.port).to.eq(3128);

    let http_http = data.results.getVariant(ProtocolType.HTTP, ProtocolType.HTTP);
    let http_https = data.results.getVariant(ProtocolType.HTTP, ProtocolType.HTTPS);
    let https_http = data.results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTP);
    let https_https = data.results.getVariant(ProtocolType.HTTPS, ProtocolType.HTTPS);

    expect(http_http.hasError()).to.be.false;
    expect(http_http.level).to.be.eq(3);
    expect(http_https.hasError()).to.be.false;
    expect(http_https.level).to.be.eq(1);
    expect(https_http.hasError()).to.be.true;
    expect(https_https.hasError()).to.be.true;

  }


}
