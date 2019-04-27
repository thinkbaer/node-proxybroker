import {IHttpPromise} from "../../../libs/http/IHttpResponse";
import {GotPromise} from "got";

export interface IHttpGotPromise<B  extends Buffer | string | object> extends IHttpPromise<B>, GotPromise<B> {

}
