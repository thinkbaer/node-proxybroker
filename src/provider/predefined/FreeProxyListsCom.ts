// http://www.freeproxylists.com

import * as request from "request-promise-native";

import {AbstractProvider} from "../AbstractProvider";
import {IProviderVariant} from "../IProviderVariant";
import {IProxyData} from "../../proxy/IProxyData";
import {IProviderWorkerAPI} from "../IProviderWorkerAPI";
import {ProxyType} from "../../lib/ProxyType";
import * as _ from 'lodash'
import {Log} from "../../logging/Log";

const NAME = 'freeproxylists'
const BASE_URL = 'http://www.freeproxylists.com'
const ip_regex = /&gt;(\d+\.\d+\.\d+\.\d+)&lt;\/td&gt;&lt;td&gt;(\d+)&lt;/g

export class FreeProxyListsCom extends AbstractProvider {

    url: string = BASE_URL

    name: string = NAME

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
        }
    ]



    do(api: IProviderWorkerAPI): Promise<void> {
        return null
    }


    async  get(variant?: IProviderVariant):Promise<IProxyData[]> {
        let self = this
        if (variant) {
            this.selectVariant(variant)
        }

        Log.info('FreeProxyListsCom ('+this.url+') selected variant is ' + this.variant.type)
        let cookies = request.jar()
        let req = await request.get(this.url + '/' + this.variant.path, {jar: cookies, resolveWithFullResponse: false})

        let matched_ids: string[] = []
        let matcher: any;
        while ((matcher = this.variant.pattern.exec(req)) !== null) {
            matched_ids.push(matcher[2])
        }

        let promises: Promise<any>[] = []
        matched_ids.forEach(id => {
            let url = self.url + '/load_' + self.variant.path_load + '_d' + id + '.html'
            let r = request.get(url, {jar: cookies})
                .then((html: string) => {
                    Log.info('FreeProxyListsCom ('+this.url+') fetch url = ' + url)
                    let matcher: any

                    let inc = 0
                    while ((matcher = ip_regex.exec(html)) !== null) {
                        let proxyData: IProxyData = {
                            ip: matcher[1],
                            port: parseInt(matcher[2])
                        }
                        inc++
                        self.push(proxyData)
                    }
                    Log.info('FreeProxyListsCom (' + url + ') found='+inc + ' all='+self.proxies.length)
                })
            promises.push(r)
        })

        return Promise.all(promises).then(() => {
            return self.proxies
        })
    }

}