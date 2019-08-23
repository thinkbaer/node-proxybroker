import {suite, test, timeout} from 'mocha-typescript';
import {HttpFactory, IHttp} from 'commons-http';

let http: IHttp;

@suite('develop/ssl/ssl') @timeout(2000000)
class ValidateCommandTest {

  static async before() {
    // Log.options({enable: true, level: 'debug'});
    http = HttpFactory.create();
  }


  @test
  async 'ssl http request'() {
    try {
      const cp = await http.get('https://httpbin.org/get', {
        proxy: 'http://127.0.0.1:3128',
        // proxyHeaders: {
        //   'proxy-select-proxy': 'http://62.141.35.197:3128'
        // }

      });
      console.log(cp);
    } catch (e) {
      console.log(e);
    }

  }


}
