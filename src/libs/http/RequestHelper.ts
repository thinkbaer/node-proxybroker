import * as cookie from "tough-cookie";
import {CookieJar} from "tough-cookie";

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
}
