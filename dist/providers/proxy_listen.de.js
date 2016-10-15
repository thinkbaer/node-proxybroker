/**
 * http://www.proxy-listen.de/Proxy/Proxyliste.html
 */
"use strict";
const request = require("request-promise");
let cheerio = require('cheerio');
class proxy_liste_de {
    constructor() {
        console.log('test construct');
        this.inc = 0;
        this._hasNext = true;
    }
    fetch() {
        // Initial fetch, after that check if "letzte Seite" or "nächste Seite" is readonly
        return request.get('http://www.proxy-listen.de/Proxy/Proxyliste.html')
            .then(html => {
            let $ = cheerio.load(html);
            let out = $('input[type=hidden]');
            let form_data = {
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
            };
            form_data[out.attr('name')] = out.attr('value');
            return request.post('http://www.proxy-listen.de/Proxy/Proxyliste.html', { form: form_data });
        })
            .then(html => {
            let $ = cheerio.load(html);
            let tbody = $('tr.proxyListHeader').parent();
            let proxies = new Set();
            tbody.find('tr').each(function (i, elem) {
                let p = {};
                p.addr = $(this).find('td:nth-child(1) > a').text().trim();
                if (p.addr.length > 0) {
                    p.port = parseInt($(this).find('td:nth-child(2)').text());
                    p.has_gateway = $(this).find('td:nth-child(3)').text() == 'Ja';
                    p.level = parseInt($(this).find('td:nth-child(4)').text());
                    proxies.add(p);
                }
            });
            console.log(proxies);
        })
            .catch(function (err) {
            console.error(err);
        });
    }
}
exports.proxy_liste_de = proxy_liste_de;
