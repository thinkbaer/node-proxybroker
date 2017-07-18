import {DEFAULT_ROTATOR_OPTIONS, IProxyRotatorOptions} from "./IProxyRotatorOptions";
import {Storage} from "../storage/Storage";
import {Utils} from "../utils/Utils";
import {IpAddr} from "../model/IpAddr";
import {IpLoc} from "../model/IpLoc";
import {ProtocolType} from "../lib/ProtocolType";
import {IpAddrState} from "../model/IpAddrState";
import {IpRotate} from "../model/IpRotate";


/**
 * create and keep a fifo queue with proxy references
 *
 *
 * options:
 * - minimum list size - if value is larger then the amount of active records, then use the record size)
 * - fallback_to_local? - if non proxies can be found
 * - reuse limit for proxies - how offen should the proxy stay in queue, till it will be paused
 *
 *
 *
 */

export class IpDesc {

    ipAddr: IpAddr

    ipLoc: IpLoc

    duration: number

    protocol: ProtocolType

}

export class ProxyRotator {

    options: IProxyRotatorOptions

    storage: Storage

    queue: IpDesc[]

    constructor(opts: IProxyRotatorOptions, storage: Storage) {
        this.options = Utils.merge(DEFAULT_ROTATOR_OPTIONS, opts);
        this.storage = storage;
    }

    async reload() {
        let c = await this.storage.connect();
        let q = c.manager.createQueryBuilder(IpAddr, 'ip')
            .innerJoin(IpAddrState, 'state', 'state.validation_id = ip.validation_id and state.addr_id = ip.id')
            .where('state.enabled = :enable', {enable: true})
            .orderBy('state.duration', 'ASC')
            .limit(1000)

        console.log(q.getSqlAndParameters())

        let list = await q.getRawAndEntities()
        console.log(list)
    }

    parseProxyHeader(headers: any) {
        let _headers: any = {};
        if (headers) {
            let keys = Object.keys(headers);
            keys.forEach(_k => {

                if (/^proxy\\-select/.test(_k)) {
                    let kn = _k.replace('proxy-select-', '');
                    if (["true", "false"].indexOf(headers[_k]) > -1) {
                        _headers[kn] = headers[_k] === "true";
                    } else if (/\d+/.test(headers[_k])) {
                        _headers[kn] = parseInt(headers[_k]);
                    } else {
                        _headers[kn] = headers[_k];
                    }
                }
            })
        }
        return _headers
    }


    async next(select?: any): Promise<IpAddr> {
        select = this.parseProxyHeader(select)
        let c = await this.storage.connect();
        let q = c.manager.createQueryBuilder(IpAddr, 'ip');

        q = q.innerJoinAndMapOne('ip.state', IpAddrState, 'state', 'state.validation_id = ip.validation_id and state.addr_id = ip.id')
        q = q.leftJoinAndMapOne('ip.rotate', IpRotate, 'rotate', 'rotate.addr_id = ip.id and rotate.protocol = state.protocol')
        q = q.orderBy('rotate.used', 'ASC');
        q = q.orderBy('state.duration', 'ASC');
        q = q.limit(1)

        q = q.where('state.enabled = :enable', {enable: true})
        q = q.andWhere('state.level > :level', {level: 0})

        if (select) {

            if (select.level && select.level > 0) {
                q = q.andWhere('state.level = :level', {level: select.level})
            }
            if (select.country) {
                q = q.innerJoinAndMapOne('ip.location', IpLoc, 'country', 'country.ip = ip.ip and country.port = ip.port')
                q = q.andWhere('country.country_code = :country_code', {country_code: select.country})
            }
            if (select['speed-limit'] && select['speed-limit'] > 0) {
                q = q.andWhere('state.duration < :speed_limit', {speed_limit: select['speed-limit']})
            }
            if (select.ssl) {
                q = q.andWhere('state.protocol = :protocol', {protocol: ProtocolType.HTTPS})
            }
        }

        let ipaddr: IpAddr = null
        let list = await q.getMany()
        if (list.length > 0) {
            ipaddr = list.shift()
            let iprotate: IpRotate = null
            if (ipaddr['rotate']) {
                iprotate = ipaddr['rotate']
            } else {
                iprotate = new IpRotate()
                iprotate.addr_id = ipaddr.id
                iprotate.protocol = ipaddr['state'].protocol
            }

            iprotate.inc++;
            if (iprotate.inc % 10 == 0) {
                iprotate.used = 0;
            } else {
                iprotate.used++
            }

            ipaddr['rotate'] = await c.save(iprotate)

        }
        await c.close()
        return ipaddr

    }
}