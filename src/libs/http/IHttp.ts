import {IHttpGetOptions} from "./IHttpGetOptions";
import {IHttpPromise, IHttpStream} from "./IHttpResponse";
import {IHttpPostOptions} from "./IHttpPostOptions";
import {IHttpPutOptions} from "./IHttpPutOptions";
import {IHttpDeleteOptions} from "./IHttpDeleteOptions";
import {IHttpHeadOptions} from "./IHttpHeadOptions";
import {IHttpPatchOptions} from "./IHttpPatchOptions";


export function isStream(pet: IHttpPromise<any> | IHttpStream<any>): pet is IHttpStream<any> {
    return (<IHttpStream<any>>pet).eventNames !== undefined;
}

export interface IHttp {

  patch(url: string, options?: IHttpPatchOptions): IHttpPromise<any> | IHttpStream<any>;

  head(url: string, options?: IHttpHeadOptions): IHttpPromise<any> | IHttpStream<any>;

  get(url: string, options?: IHttpGetOptions): IHttpPromise<any> | IHttpStream<any>;

  post(url: string, options?: IHttpPostOptions): IHttpPromise<any> | IHttpStream<any>;

  put(url: string, options?: IHttpPutOptions): IHttpPromise<any> | IHttpStream<any>;

  delete(url: string, options?: IHttpDeleteOptions): IHttpPromise<any> | IHttpStream<any>;

}
