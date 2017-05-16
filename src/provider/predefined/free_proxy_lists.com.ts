/**
 * TODO Rewrite completely and use IProvider
 */



import * as request from "request-promise-native";
import {IProvider} from "../IProvider";



const NAME = 'freeproxylists.com'
const BASE_URL = 'http://www.freeproxylists.com'


// export class FreeProxyListenProvider implements IProvider {
//
//
//
// }

// /*
//  export default (broker) => {
//
//
//  let job = broker.defineSearchJob(NAME + '_anon', ProxyType.HTTP_ANON, function (broker, param, done) {
//
//  })
//
//
//  }
//  */
//
//
// export function createScrapJob(opts: any): Function {
//     return (api: API, done: Function = null): Promise<any> => {
//         var cookies = request.jar()
//         var p:any = request
//             .get(BASE_URL + '/' + opts.path, {jar: cookies})
//             .then((html: string) => {
//
//                 var matched_ids: string[] = []
//                 var matcher: any;
//                 while ((matcher = opts.pattern.exec(html)) !== null) {
//                     matched_ids.push(matcher[2])
//                 }
//
//                 var promises: Promise<any>[] = []
//                 matched_ids.forEach(id => {
//                     var url = BASE_URL + '/load_' + opts.path_load + '_d' + id + '.html'
//                     var r = request
//                         .get(url, {jar: cookies})
//                         .then((html: string) => {
//
//                             var ip_regex = /&gt;(\d+\.\d+\.\d+\.\d+)&lt;\/td&gt;&lt;td&gt;(\d+)&lt;/g
//                             var matcher: any
//                             while ((matcher = ip_regex.exec(html)) !== null) {
//                                 var _ip = matcher[1]
//                                 var _port = matcher[2]
//
//                                 api.enqueue(_ip, _port, opts.flags)
//
//                             }
//                         })
//                     promises.push(r)
//                 })
//                 return Promise.all(promises)
//             })
//         if (done) {
//             p = p
//                 .then(()=> {
//                     done()
//                 })
//                 .catch((err:Error) => {
//                     done(err)
//                 })
//         }
//         return p;
//     }
// }
//
// /*
// * Anonymous proxy servers hide your IP address or modify it in some way to prevent target server know about it. They may provide or may hide information about you and your reading interests. Besides that, they let anyone know that you are surfing through a proxy server.
// * http://www.freeproxylists.com/anonymous.html
// * http://www.freeproxylists.com/load_anon_d[\d+].html => returns xml for detailed list with table [IP,Port,HTTPS,Latency,Date(checked),Country]
// */
// export const anonJob: Function = createScrapJob({
//     path: 'anonymous.html',
//     path_load: 'anon',
//     pattern: /href=(\"|\')anon\/d(\d+)\.html(\"|\')/g,
//     flags: ProxyType.HTTP_ANON
// })

// export  anonJob


// const PROXY_LIST_DE = BASE_URL + '/Proxy/Proxyliste.html'

/*
 * Multiple variant exist her
 *
 * Elite proxy servers hide your IP address and thereby prevent your from unauthorized access to your computer through the Internet. They do not provide anyone with your IP address and effectively hide any information about you and your reading interests. Besides that, they don't even let anyone know that you are surfing through a proxy server.
 * http://www.freeproxylists.com/elite.html
 * http://www.freeproxylists.com/load_elite_d[\d+].html => returns xml for detailed list with table [IP,Port,HTTPS,Latency,Date(checked),Country]
 *
 */





/*
 class PageHandler {

 short : string


 }

 export default class FreeProxyLists_Com implements Provider {


 handler : Array<PageHandler>


 init(options : any) {
 let self = this
 self.handler.push(new PageHandler('http://www.freeproxylists.com/anonymous.html'))
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