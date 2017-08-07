import * as dns from "dns";
import * as _ from 'lodash'

import {PlatformUtils} from "./PlatformUtils";
import {Log} from "../lib/logging/Log";

if (dns['getServers'] && dns['getServers']().length < 2) {
    let serversToSet = [
        '127.0.0.1',
        '8.8.8.8', '8.8.4.4',   // Google Public DNS
        '77.88.8.8', '77.88.8.1', // Yandex Basic
        //'77.88.8.88', '77.88.8.2', // Yandex Safe
        //'77.88.8.7',  '77.88.8.3', // Yandex Family
    ];
    dns.setServers(serversToSet)
}


export default class DomainUtils {


    static IP_REGEX = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
    static HOSTS: { host: string, ip: string }[] = [];

    static domainLookup(domain: string): Promise<{ addr: string, family: number }> {

        return new Promise(function (resolve, reject) {

            if (DomainUtils.IP_REGEX.test(domain)) {
                resolve({
                    addr:domain,
                    family:4
                })
            } else {
                dns.lookup(domain, function (err, address, family) {
                    if (err) {
                        resolve(null)
                    } else {
                        resolve({addr: address, family: family})
                    }
                })
            }
        })
    }

    static reverse(ip: string, local: boolean = false): Promise<string[]> {
        if (this.IP_REGEX.test(ip)) {

            return new Promise(function (resolve, reject) {
                let id = setTimeout(() => {resolve(null)},250)
                dns.reverse(ip, function (err, hostnames) {
                    clearTimeout(id)
                    if (err) {
                        resolve()
                    } else {
                        resolve(hostnames)
                    }


                })

            })
                .then((hostnames: string[]) => {
                    // TODO reload host if not loaded
                    let hosts = _.filter(DomainUtils.HOSTS, {ip: ip});
                    if (!_.isEmpty(hosts)) {
                        hosts.forEach(_x => {
                            hostnames.unshift(_x.host)
                        })
                    }
                    return _.uniq(hostnames)
                }).catch(e => {
                    Log.error(e)
                    throw e
                })
        } else {
            return Promise.resolve([])
        }
    }

    static reloadHosts() {
        this.HOSTS = this.getHostsSync()
    }

    static getHostsSync(): { host: string, ip: string }[] {
        let content = PlatformUtils.getHostFileContent();
        let hosts: { host: string, ip: string }[] = [];
        content.split(/\r?\n/).map(function (x: string) {
            var matches = /^\s*?([^#]+?)\s+([^#]+?)$/.exec(x);
            if (matches && matches.length === 3) {
                matches[2].trim().split(' ').forEach(_x => {
                    hosts.push({host: _x, ip: matches[1]}); // host:ip
                })
            }
            return null
        });
        return hosts
    }
}