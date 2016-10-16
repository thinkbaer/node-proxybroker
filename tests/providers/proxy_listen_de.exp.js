let assert = require('assert');

let request = require("request-promise");
const cheerio = require('cheerio')
const PROXY_LIST_DE = 'http://www.proxy-listen.de/Proxy/Proxyliste.html'
let fs = require('fs');

var form_data = {
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

describe('Test Provider: ProxyListenDe', function () {


    it('test', function (done) {

        this.timeout(20000)
        var jar = request.jar()

        var c1 = request.cookie('cookieconsent_dismissed=yes');
        jar.setCookie(c1, 'http://www.proxy-listen.de');
        var c2 = request.cookie('_gat=1');
        jar.setCookie(c2, 'http://www.proxy-listen.de');

        request
            .get(PROXY_LIST_DE,{jar:jar})
            .then(function (html) {
                console.log(jar)
                let $ = cheerio.load(html)
                let out = $('input[type=hidden]')
                form_data[out.attr('name')] = out.attr('value');
                fs.writeFileSync('/tmp/test_base',html)
                return request.post(PROXY_LIST_DE,{form:form_data,jar:jar})
            })
            .then(function (html) {
                console.log(jar)
                let $ = cheerio.load(html)
                let out = $('input[type=hidden]')
                form_data[out.attr('name')] = out.attr('value');
                delete form_data['submit']
                form_data['next'] = 'nächste Seite'
                fs.writeFileSync('/tmp/test_01',html)
                return request.post(PROXY_LIST_DE,{form:form_data,jar:jar})
            })
            .then(function (html) {
                console.log(jar)
                fs.writeFileSync('/tmp/test_02',html)
                return request.post(PROXY_LIST_DE,{form:form_data,jar:jar})

            })
            .then(function (html) {
                console.log(jar)
                fs.writeFileSync('/tmp/test_03',html)
                return request.post(PROXY_LIST_DE,{form:form_data,jar:jar})

            })
            .then(function (html) {
                console.log(jar)
                fs.writeFileSync('/tmp/test_04',html)
//                return request.post(PROXY_LIST_DE,{form:form_data,jar:jar})

            })
            .then(function () {
                done()
            })


    })
});