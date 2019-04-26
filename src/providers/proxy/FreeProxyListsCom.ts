// http://www.freeproxylists.com

import * as got from "got";

import {Log} from "@typexs/base";
import {AbstractProvider} from "../../libs/provider/AbstractProvider";
import {IProviderVariant} from "../../libs/provider/IProviderVariant";
import {ProxyType} from "../../libs/specific/ProxyType";
import {IProxyData} from "../../libs/proxy/IProxyData";
import * as cookie from "tough-cookie";

const NAME = 'freeproxylists';
const BASE_URL = 'http://www.freeproxylists.com';
const ip_regex = /&gt;(\d+\.\d+\.\d+\.\d+)&lt;\/td&gt;&lt;td&gt;(\d+)&lt;/g;

export class FreeProxyListsCom extends AbstractProvider {

  url: string = BASE_URL;

  name: string = NAME;

  variants: IProviderVariant[] = [
    {
      type: 'anonym',
      path: 'anonymous.html',
      pattern: /href=(\"|\')anon\/d(\d+)\.html(\"|\')/g,
      path_load: 'anon',
      flags: ProxyType.HTTP_ANON
    },
    {
      type: 'transparent',
      path: 'non-anonymous.html',
      pattern: /href=(\"|\')nonanon\/d(\d+)\.html(\"|\')/g,
      path_load: 'nonanon',
      flags: ProxyType.HTTP_ANON
    },
    {
      type: 'elite',
      path: 'elite.html',
      pattern: /href=(\"|\')elite\/d(\d+)\.html(\"|\')/g,
      path_load: 'elite',
      flags: ProxyType.HTTP_ANON
    },
    {
      type: 'https',
      path: 'https.html',
      pattern: /href=(\"|\')https\/d(\d+)\.html(\"|\')/g,
      path_load: 'https',
      flags: ProxyType.HTTPS_ANON
    },
    {
      type: 'standard',
      path: 'standard.html',
      pattern: /href=(\"|\')standard\/d(\d+)\.html(\"|\')/g,
      path_load: 'standard',
      flags: ProxyType.HTTPS_ANON
    },
    {
      type: 'us',
      path: 'us.html',
      pattern: /href=(\"|\')us\/d(\d+)\.html(\"|\')/g,
      path_load: 'us',
      flags: ProxyType.HTTP_ANON
    },
    {
      type: 'uk',
      path: 'uk.html',
      pattern: /href=(\"|\')uk\/d(\d+)\.html(\"|\')/g,
      path_load: 'uk',
      flags: ProxyType.HTTP_ANON
    },
    {
      type: 'ca',
      path: 'ca.html',
      pattern: /href=(\"|\')ca\/d(\d+)\.html(\"|\')/g,
      path_load: 'ca',
      flags: ProxyType.HTTP_ANON
    },
    {
      type: 'fr',
      path: 'fr.html',
      pattern: /href=(\"|\')fr\/d(\d+)\.html(\"|\')/g,
      path_load: 'fr',
      flags: ProxyType.HTTP_ANON
    }
  ];


  async get(variant?: IProviderVariant): Promise<IProxyData[]> {
    let self = this;
    if (variant) {
      this.selectVariant(variant)
    }

    Log.info('FreeProxyListsCom: (' + this.url + ') selected variant is ' + this.variant.type);
    let cookies = new cookie.CookieJar();
    //let cookies = request.jar();
    let resp = await got.get(this.url + '/' + this.variant.path, {cookieJar: cookies, rejectUnauthorized: false});
    let html = resp.body;

    let matched_ids: string[] = [];
    let matcher: any;
    while ((matcher = this.variant.pattern.exec(html)) !== null) {
      matched_ids.push(matcher[2])
    }

    for (let id of matched_ids) {
      let url = self.url + '/load_' + self.variant.path_load + '_d' + id + '.html';
      let r = await got.get(url, {cookieJar: cookies});
      html = r.body;
      Log.debug('FreeProxyListsCom: (' + this.url + ') fetch url = ' + url);
      let matcher: any;

      let inc = 0;
      while ((matcher = ip_regex.exec(html)) !== null) {
        let proxyData: IProxyData = {
          ip: matcher[1],
          port: parseInt(matcher[2])
        };
        inc++;
        self.push(proxyData)
      }
      Log.info('FreeProxyListsCom: (' + url + ') found=' + inc + ' all=' + self.proxies.length);
    }
    return self.proxies;
  }

}
