

import * as dns from "dns";

export default class DomainUtils {


    static domainLookup(domain: string): Promise<{ addr: string, family: string }> {
        return new Promise(function (resolve, reject) {
            dns.lookup(domain, function (err, address, family) {
                if (err) {
                    reject(err)
                } else {
                    resolve({addr: address, family: family})
                }
            })
        })
    }
}