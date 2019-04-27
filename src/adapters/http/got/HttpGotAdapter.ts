import * as _ from "lodash";
import * as got from "got";
import * as tunnel from "tunnel";
import {IHttp} from "../../../libs/http/IHttp";
import {IHttpGetOptions} from "../../../libs/http/IHttpGetOptions";
import {IHttpDeleteOptions} from "../../../libs/http/IHttpDeleteOptions";
import {IHttpPostOptions} from "../../../libs/http/IHttpPostOptions";
import {IHttpPutOptions} from "../../../libs/http/IHttpPutOptions";
import {IHttpHeadOptions} from "../../../libs/http/IHttpHeadOptions";
import {IHttpPatchOptions} from "../../../libs/http/IHttpPatchOptions";
import {IHttpGotPromise} from "./IHttpGotPromise";
import {IHttpStream} from "../../../libs/http/IHttpResponse";
import {IHttpOptions} from "../../../libs/http/IHttpOptions";
import {GotEmitter} from "got";


export class HttpGotAdapter implements IHttp {

  private static wrap(url: string, method: string, options: IHttpOptions) {
    if (_.has(options, 'proxy') && options.proxy) {
      let proxyUrl = new URL(options.proxy);
      let targetUrl = new URL(url);

      let proxyProtocol = proxyUrl.protocol.replace(':', '').toLowerCase();
      let targetProtocol = targetUrl.protocol.replace(':', '').toLowerCase();


      if (proxyProtocol == 'http' && targetProtocol == 'http') {
        options.agent = tunnel.httpOverHttp({proxy: {host: proxyUrl.host, port: parseInt(proxyUrl.port), headers: {}}});
      } else if (proxyProtocol == 'http' && targetProtocol == 'https') {
        options.agent = tunnel.httpOverHttps({
          proxy: {
            host: proxyUrl.host,
            port: parseInt(proxyUrl.port),
            headers: {}
          }
        });
      } else if (proxyProtocol == 'https' && targetProtocol == 'http') {
        options.agent = tunnel.httpsOverHttp({
          proxy: {
            host: proxyUrl.host,
            port: parseInt(proxyUrl.port),
            headers: {}
          }
        });
      } else if (proxyProtocol == 'https' && targetProtocol == 'https') {
        options.agent = tunnel.httpsOverHttps({
          proxy: {
            host: proxyUrl.host,
            port: parseInt(proxyUrl.port),
            headers: {}
          }
        });
      }
    }

    if (_.has(options, 'stream') && options.stream) {
      let stream:GotEmitter = <any>got(url, options);
      let _stream = (<IHttpStream<any>>stream);
      _stream.asPromise = (): IHttpGotPromise<any> => {
        return <IHttpGotPromise<any>>new Promise<any>((resolve, reject) => {
          stream.once('response', (resp) => resolve(resp));
          stream.once('error', (err) => reject(err));
        });
      };
      return _stream;
    }
    if(options){
      return got[method](url, options)
    }else{
      return got[method](url)
    }

  }


  get(url: string, options?: IHttpGetOptions): IHttpGotPromise<any> | IHttpStream<any> {
    return HttpGotAdapter.wrap(url, 'get', options);
  }


  post(url: string, options?: IHttpPostOptions): IHttpGotPromise<any> | IHttpStream<any> {
    return HttpGotAdapter.wrap(url, 'post', options);
  }


  put(url: string, options: IHttpPutOptions = null): IHttpGotPromise<any> | IHttpStream<any> {
    return HttpGotAdapter.wrap(url, 'put', options);
  }


  delete(url: string, options: IHttpDeleteOptions = null): IHttpGotPromise<any> | IHttpStream<any> {
    return HttpGotAdapter.wrap(url, 'delete', options);
  }


  head(url: string, options?: IHttpHeadOptions): IHttpGotPromise<any> | IHttpStream<any> {
    return HttpGotAdapter.wrap(url, 'head', options);
  }


  patch(url: string, options?: IHttpPatchOptions): IHttpGotPromise<any> | IHttpStream<any> {
    return HttpGotAdapter.wrap(url, 'patch', options);
  }

}
