/**
 * http://www.proxy-listen.de/Proxy/Proxyliste.html
 */
"use strict";
// const cheerio = require('cheerio')
const BASE_URL = 'http://www.proxy-listen.de';
const PROXY_LIST_DE = BASE_URL + '/Proxy/Proxyliste.html';
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
//# sourceMappingURL=proxy_listen.de.js.map