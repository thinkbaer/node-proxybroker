import * as _ from 'lodash';

import * as cookie from "tough-cookie";
import {CookieJar} from "tough-cookie";
import Exceptions from "@typexs/server/libs/server/Exceptions";
import {IHttpHeaders, IKeyValuePair} from "@typexs/base";

export interface IRequestData {
  secured?: boolean
  body?: Buffer
  headers?: Buffer
  query?: Buffer
  statusCode?: number
  error?: Error
}


export class RequestHelper {
  static setCookie(jar: CookieJar, value: string, url: string) {
    return new Promise((resolve, reject) => {
      jar.setCookie(cookie.Cookie.parse(value), url, (err, cookie1) => {
        if (err) {
          reject(err)
        } else {
          resolve(cookie1);
        }
      });
    })
  }

  static NEWLINE() {
    let NEWLINE = Buffer.allocUnsafe(2);
    NEWLINE.write('\r\n');
    return NEWLINE;
  }

  static isSecured(data: Buffer) {
    return data[0] == 0x16 || data[0] == 0x80 || data[0] == 0x00;
  }

  static parse(data: Buffer): IRequestData {
    // this.ended = false;
    // this.debug('socket data ' + data.length)
    if (!data) {
      return null;
    }

    let req: IRequestData = {secured: false};

    if (this.isSecured(data)) {
      return {secured: true};
    }


    let headerEnd = data.indexOf('\r\n');
    let headersEnd = data.indexOf('\r\n\r\n');


    if (headerEnd < headersEnd && headersEnd > 0) {
      req.query = Buffer.allocUnsafe(headerEnd);
      req.headers = Buffer.allocUnsafe(headersEnd - headerEnd - 2);
      req.body = Buffer.allocUnsafe(data.length - headersEnd - 4);

      data.copy(req.query, 0, 0, headerEnd);
      data.copy(req.headers, 0, headerEnd + 2, headersEnd);
      data.copy(req.body, 0, headersEnd + 4);


      if (req.query.length > 0) {
        let first = req.query.toString();
        let matches = first.match(/ (\d{3}) /);
        if (first && matches && matches.length > 0) {
          req.statusCode = parseInt(matches[1]);
          if (req.statusCode >= 400) {
            req.error = Exceptions.handle(new Error(first))
          }
        }
      }
    }

    return req;
  }

  static build(req: IRequestData): Buffer {
    let list: Buffer[] = [];
    const buf = Buffer.allocUnsafe(2);
    buf.write('\r\n');

    if (req.query) {
      list.push(req.query);
      list.push(buf);
    } else {
      throw new Error('empty query')
    }

    if (req.headers) {
      list.push(req.headers);
      list.push(buf);
      list.push(buf);
    }

    if (req.body) {
      list.push(req.body);
    }
    return Buffer.concat(list);
  }


  static addHeaders(req: IRequestData, headers: IHttpHeaders) {

    let x: IKeyValuePair<string>[] = [];
    let keys = _.keys(headers).filter(k => ['host', 'connection'].indexOf(k.toLowerCase()) == -1);
    keys.map(k => x.push({key: k, value: headers[k]}));

    if (req.headers) {
      let _headStr = req.headers.toString();
      for (let _x of _headStr.split('\r\n')) {
        let split = _x.split(':', 1);
        let orgK = split.shift().trim();
        let value = _x.replace(new RegExp('^' + orgK + '\\s*:'), '').trim();
        let k = orgK.toLocaleLowerCase();


        let exists = _.filter(x, _k => _k.key.toLocaleLowerCase() == k);
        if (exists.length > 0) {
          // replace value
          continue;
        } else {
          x.push({key: orgK, value: value})
        }
      }
    }

    let headStr = x.map(k => k.key + ': ' + k.value).join('\r\n');
    req.headers = Buffer.allocUnsafe(headStr.length);
    req.headers.write(headStr);
  }


}
