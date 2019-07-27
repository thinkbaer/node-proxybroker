import {suite, test, timeout} from 'mocha-typescript';
import {expect} from 'chai';
import * as http from 'http';
import {HttpFactory, HttpGotAdapter, IHttpResponse, isStream} from 'commons-http';
import {Writable} from 'stream';

const K_WORKDIR = 'workdir';

/**
 * TODO
 */
@suite('functional/http/got_adapter') @timeout(60000)
class HttpGotAdapterSpec {

  static async before() {
    await HttpFactory.load();
  }

  @test
  async 'get as stream'() {

    const httpAdapter = new HttpGotAdapter();

    const respStream = httpAdapter.get('http://example.com', {stream: true});

    if (isStream(respStream)) {

      let buffer = '';
      respStream.pipe(new Writable({
        write: (chunk, encoding) => {
          buffer += chunk.toString();

        }
      }));

      let reqClient = null;
      // let socket = null;
      respStream.on('request', (req: http.ClientRequest) => {
        reqClient = req;
        // req.once('end', () => {
        //   console.log('end1');
        // });
        // reqClient.on('socket', (s) => {
        //   socket = s;
        //   s.once('end', () => {
        //     console.log('end2');
        //   });
        // });
      });

      const resp: any[] = [];
      respStream.on('response', (req) => {
        resp.push(req);
      });


      await respStream.asPromise();
      expect(reqClient).to.instanceOf(http.ClientRequest);
      expect(resp).to.have.length(1);
      expect(buffer.length).to.be.greaterThan(10);

      // await TestHelper.wait(100);

    } else {

      expect(false).to.be.true('request should be a stream');
    }


  }

  @test
  async 'get as promise'() {
    const httpAdapter = new HttpGotAdapter();
    const respPromise = httpAdapter.get('http://example.com');
    expect(isStream(respPromise)).to.be.false;
    const resp: IHttpResponse<any> = await respPromise;
    expect(resp.body).to.contain('This domain is established to be used for illustrative examples in documents.');
  }


}


