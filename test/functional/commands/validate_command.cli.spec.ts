import {suite, test, timeout} from 'mocha-typescript';
import {expect} from 'chai';

import {Log} from '@typexs/base';
import SpawnCLI from './../SpawnCLI';
import {IProxyServerOptions} from '../../../src/libs/server/IProxyServerOptions';
import {ProxyServer} from '../../../src/libs/server/ProxyServer';


const cfg: any = {
  validator: {
    judge: {
      remote_lookup: false,
      selftest: false,
      ip: '127.0.0.1'
    }
  }
};


@suite('commands/ValidateCommand - CLI version')
class CLIValidateCommandTest {

  static before() {
    Log.options({enable: false});
    SpawnCLI.timeout = 15000;
  }


  @test.skip
  async 'passed file'() {

    const proxy_options: IProxyServerOptions = <IProxyServerOptions>{
      // url: 'http://127.0.0.1:3128',
      ip: 'proxy.local',
      protocol: 'http',
      port: 3128,
      level: 3,
      toProxy: false,

    };

    const http_proxy_server = new ProxyServer();
    http_proxy_server.initialize(proxy_options);
    await http_proxy_server.start();
    const cli = await SpawnCLI.run('validate', 'test/_files/proxylists/list01.csv', '-v', '-c', JSON.stringify(cfg));
    await http_proxy_server.stop();


    let data = JSON.parse(cli.stdout);
    data = data.shift();
    expect(data.ip).to.eq('127.0.0.11');
    expect(data.port).to.eq(3128);

    const http_http = data.variants.shift();
    const http_https = data.variants.shift();
    const https_http = data.variants.shift();
    const https_https = data.variants.shift();


    expect(http_http.error).to.be.null;
    expect(http_http.level).to.eq(3);

    expect(http_https.error).to.be.null;
    expect(http_https.level).to.eq(1);

    expect(https_http).to.not.be.null;
    expect(https_https).to.not.be.null;
  }

  @test.skip
  async 'no passed parameter'() {
    const cli = await SpawnCLI.run('validate');
    expect(cli.stderr).to.contain('cli.ts validate <host_or_file>');
    expect(cli.stderr).to.contain('--verbose, -v');
  }

  @test.skip
  async 'usage'() {
    const cli = await SpawnCLI.run();
    expect(cli.stderr).to.contain('validate <host_or_file>');
  }

}
