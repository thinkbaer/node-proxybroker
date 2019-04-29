import {Transform, TransformOptions} from "stream";
import {RequestHelper} from "../http/RequestHelper";
import * as _ from "lodash";
import {IHttpHeaders, Log} from "@typexs/base";


export class HttpHeaderTransform extends Transform {

  ssl: boolean = undefined;

  headers: IHttpHeaders = null;

  constructor(opts: TransformOptions & {headers?:IHttpHeaders} = {}) {
    super(_.defaults(opts, {writableObjectMode: true}));
    this.headers = _.get(opts,'headers',null);
  }

  setHeaders(h:IHttpHeaders){
    this.headers = h;
  }

  getHeaders(){
    return this.headers;
  }



  _transform(chunk: any, encoding: string, callback: (error?: (Error | null), data?: any) => void): void {
    if (this.headers) {
      let requestData = RequestHelper.parse(chunk);
      if (_.isUndefined(this.ssl)) {
        this.ssl = requestData.secured;
        if (requestData && !this.ssl) {
          RequestHelper.addHeaders(requestData, this.headers);
          try {
            chunk = RequestHelper.build(requestData);
          } catch (err) {
          }
        }
      }
    }

    callback(null, chunk);
  }

}
