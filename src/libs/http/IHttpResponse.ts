import * as http from "http";
import * as nodeStream from "stream";
import {EventEmitter} from "events";


export type IHttpPromise<B extends Buffer | string | object> = Promise<IHttpResponse<B>> & EventEmitter;


export type IHttpStream<B extends Buffer | string | object> =
  nodeStream.Duplex
  & EventEmitter
  & { asPromise(): IHttpPromise<any> };


export interface IHttpResponse<B> extends http.IncomingMessage {
  body: B;
  url: string;
  requestUrl: string;
  fromCache: boolean;
  redirectUrls?: string[];
}
