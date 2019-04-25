/**
 * http://www.proxy-listen.de/Proxy/Proxyliste.html
 */

// import * as request from "request-promise-native";
import * as got from "got";
import * as cookie from "tough-cookie";
import * as _ from 'lodash'
import {AbstractProvider} from "../../libs/provider/AbstractProvider";
import {IProviderVariant} from "../../libs/provider/IProviderVariant";
import {IProxyData} from "../../libs/proxy/IProxyData";
import {Log} from "@typexs/base";

const NAME = 'proxylistende';
const BASE_URL = 'https://www.proxy-listen.de';
const PROXY_LIST_DE = BASE_URL + '/Proxy/Proxyliste.html';
//const ip_regex = /&gt;(\d+\.\d+\.\d+\.\d+)&lt;\/td&gt;&lt;td&gt;(\d+)&lt;/g;

const MATCH_IP_PORT_REGEX = />(\d+\.\d+\.\d+\.\d+)[^\d]+(\d+)/g;


export class ProxyListenDe extends AbstractProvider {

  url: string = BASE_URL;

  name: string = NAME;

  variants: IProviderVariant[] = [
    {
      type: 'http',
    },
    {
      type: 'https',
    },
    {
      type: 'httphttps',
    }
  ];


  async get(variant?: IProviderVariant): Promise<IProxyData[]> {
    let self = this;
    if (variant) {
      this.selectVariant(variant)
    }

    Log.info('ProxyListenDe: (' + this.url + ') selected variant is ' + this.variant.type);


    let cookies = new cookie.CookieJar();
    //let form_data = new FormData();

    let data = {
      filter_port: '',
      filter_http_gateway: '',
      filter_http_anon: '',
      filter_response_time_http: '',
      filter_country: '',
      filter_timeouts1: '',
      liststyle: 'info',
      proxies: '300',
      type: this.variant.type,
      submit: 'Anzeigen',
    };
    /*
        _.keys(data).map(k => {
          form_data.append(k, data[k]);
        })
    */
    //let c1 = request.cookie('cookieconsent_dismissed=yes');
    await new Promise((resolve, reject) => {
      cookies.setCookie(cookie.Cookie.parse('cookieconsent_dismissed=yes'), BASE_URL, (err, cookie1) => {
        if (err) {
          reject(err)
        } else {
          resolve(cookie1);
        }
      });
    })

    //let c2 = request.cookie('_gat=1');
    await new Promise((resolve, reject) => {
      cookies.setCookie(cookie.Cookie.parse('_gat=1'), BASE_URL, (err, cookie1) => {
        if (err) {
          reject(err)
        } else {
          resolve(cookie1);
        }
      });
    })

    let resp = await got.get(PROXY_LIST_DE, {cookieJar: cookies, rejectUnauthorized: false});

    let html = resp.body;

    let matched = html.match(/(<input[^>]+type=("|')hidden("|')[^>]*>)/g);
    let hidden_input = matched.shift();
    let name = hidden_input.match(/name=("|')([^("|')]+)("|')/)[2];
    let value = hidden_input.match(/value=("|')([^("|')]+)("|')/)[2];
    //form_data.append(name, value);
    data[name] = value;

    let inc = 0;
    let skip = false;
    while (inc < 5 && !skip) {

      let size_before = self.proxies.length;
      let _form_data = _.clone(data);

      if (inc > 0) {
        delete _form_data['submit'];
        _form_data['next'] = 'nächste Seite'
      }

      resp = await got.post(PROXY_LIST_DE, {
        body: _form_data,
        form: true,
        cookieJar: cookies,
        rejectUnauthorized: false
      });
      inc++;

      html = resp.body;

      let matcher = null;
      while ((matcher = MATCH_IP_PORT_REGEX.exec(html)) !== null) {
        let proxyData: IProxyData = {
          ip: matcher[1],
          port: parseInt(matcher[2])
        };
        self.push(proxyData)
      }

      let size_after = self.proxies.length;
      skip = size_before === size_after;

      Log.debug('ProxyListenDe: variant=' + this.variant.type + ' count=' + size_after + ' skipping=' + skip + ' round=' + inc)

    }
    Log.info('ProxyListenDe: variant=' + this.variant.type + ' finished');

    return self.proxies
  }

}

/*

export default class ProxyListen_De implements Provider {


    inc: number
    _hasNext: boolean
    cookies: any;
    form_data: {[key: string]: string}



    newFormData() : {[key: string]: string}{
        let self = this
        let form_data: {[key: string]: string} = {}
        Object.keys(this.form_data).forEach(key => {
            form_data[key] = self.form_data[key]
        })
        return form_data
    }

    init(options : any) {
        let self = this
        this._hasNext = false
        this.inc = 0
        options = options || {}
        this.cookies = request.jar()

        this.form_data = {
            filter_port: '',
            filter_http_gateway: '',
            filter_http_anon: '',
            filter_response_time_http: '',
            filter_country: '',
            filter_timeouts1: '',
            liststyle: 'info',
            proxies: '300',
            type: 'http',
            submit: 'Anzeigen',
        }

        if(options.override){
            Object.keys(options.override).forEach(_key => self.form_data[_key]=options.override[_key])
        }

        var c1 = request.cookie('cookieconsent_dismissed=yes');
        this.cookies.setCookie(c1, BASE_URL);
        var c2 = request.cookie('_gat=1');
        this.cookies.setCookie(c2,  BASE_URL);

        return request.get(PROXY_LIST_DE,{jar: self.cookies})
            .then(html => {
                let $ = cheerio.load(html)
                let out = $('input[type=hidden]')
                self.form_data[out.attr('name')] = out.attr('value');
                self._hasNext = true
            })
    }

    hasNext() {
        return Promise.resolve(this._hasNext)
    }


    next() {
        let self = this
        // Initial fetch, after that check if "letzte Seite" or "nächste Seite" is readonly

        let form_data = self.newFormData()

        if(self.inc > 0){
            delete form_data['submit']
            form_data['next'] = 'nächste Seite'
        }

        return request.post(PROXY_LIST_DE, {form: form_data,jar: self.cookies})
            .then(html => {
                self.inc++
                let $ = cheerio.load(html)
                self._hasNext = $('input#next_page').attr('disabled') != 'disabled'
                return self.parse($)
            })
            .catch(function (err) {
                console.error(err)
            })
    }


    parse($ : any) {

        let proxies = new Set<ProxySpec>();
        let tbody = $('tr.proxyListHeader').parent()
        if (tbody) {
            tbody.find('tr').each(function (i: any, elem: any) {
                let p = <ProxySpec>{}
                p.addr = $(this).find('td:nth-child(1) > a').text().trim()
                if (p.addr.length > 0) {
                    p.port = parseInt($(this).find('td:nth-child(2)').text())
                    p.has_gateway = $(this).find('td:nth-child(3)').text() == 'Ja'
                    p.level = parseInt($(this).find('td:nth-child(4)').text())
                    proxies.add(p)
                }
            })
        }
        return proxies
    }
}

*/
