import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import * as http from "http";
import {HttpGotAdapter} from "../../../src/adapters/http/got/HttpGotAdapter";
import {isStream} from "../../../src/libs/http/IHttp";
import {TestHelper} from "../TestHelper";
import {IHttpPromise, IHttpResponse} from "../../../src/libs/http/IHttpResponse";

const K_WORKDIR = 'workdir';

/**
 * TODO
 */
@suite('functional/http/got_adapter')
class Http_got_adapterSpec {


  @test
  async 'get as stream'() {
    let httpAdapter = new HttpGotAdapter();

    let respStream = httpAdapter.get('http://example.com', {stream: true});
    if (isStream(respStream)) {
      let reqClient = null;
      let socket = null;
      respStream.on('request', (req: http.ClientRequest) => {
        reqClient = req;
        reqClient.on("socket", (s) => {
          socket = s
        });
      });

      let resp: any[] = [];
      respStream.on('response', (req) => {
        resp.push(req);
      });

      let resp2 = await respStream.asPromise();
      expect(reqClient).to.instanceOf(http.ClientRequest);

      await TestHelper.wait(100);
      console.log(resp2.body)

    } else {

      expect(false).to.be.true('request should be a stream');
    }


  }

  @test
  async 'get as promise'() {
    let httpAdapter = new HttpGotAdapter();

    let req = null;
    let respPromise = httpAdapter.get('http://example.com');
    (<any>respPromise).on('request', (_req: any) => {
      //console.log(req);
      req = _req;
    });

    /*
    (<any>respPromise).on('response', (req: any) => {
      //console.log(req);

      req.on('finish', () => {

      });
      req.on('end', () => {
        //console.log('b');
        //console.log(req.body)
      })
    });
    */
     
    if (isStream(respPromise)) {
      return;
    }

    let resp: IHttpResponse<any> = await respPromise;
    expect(req).to.be.instanceOf(http.ClientRequest);
    expect(resp.body).to.contain('This domain is established to be used for illustrative examples in documents.');
  }


}


