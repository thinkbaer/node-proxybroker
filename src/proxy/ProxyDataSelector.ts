import * as _ from 'lodash'

import subscribe from "../events/decorator/subscribe"
import {ProxyDataFetchedEvent} from "../provider/ProxyDataDeliveryEvent";
import {Storage} from "../storage/Storage";

import {IQueueProcessor} from "../queue/IQueueProcessor";
import {IProxyData} from "./IProxyData";
import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import {IpAddr} from "../storage/entity/IpAddr";
import {ProxyData} from "./ProxyData";
import {Utils} from "../utils/Utils";
import DomainUtils from "../utils/DomainUtils";

export class ProxyDataSelector implements IQueueProcessor<IProxyData[]> {

    chunk_size: number = 100

    recheck_after: number = 24 * 60 * 60 * 1000

    storage: Storage

    queue: AsyncWorkerQueue<IProxyData[]>


    constructor(storage: Storage) {
        let parallel = 200
        this.storage = storage
        this.queue = new AsyncWorkerQueue<IProxyData[]>(this, {concurrent: parallel})
    }

    @subscribe(ProxyDataFetchedEvent)
    async filter(fetched: ProxyDataFetchedEvent): Promise<void> {
        // - verify if the address and port are correct
        let proxy = []
        for (let addr of fetched.list) {
            if (DomainUtils.IP_REGEX.test(addr.ip) && 0 < addr.port && addr.port <= 65536) {
                proxy.push(addr)
            }
        }

        // - chunk the array and push to worker queue
        let entries = _.chunk(proxy, this.chunk_size)
        while (entries.length > 0) {
            let entry = entries.shift()
            this.queue.push(entry)
        }
    }

    async await(): Promise<void> {
        return this.queue.await()
    }


    async do(workLoad: IProxyData[]): Promise<any> {
        let self = this

        // get existing entries
        let now = new Date()
        let conn = await this.storage.connect()
        let qb = conn.connection.getRepository(IpAddr)
        let cqb = qb.createQueryBuilder('addr')
        cqb = cqb.select()
        let i = 0
        workLoad.forEach(_proxy_ip => {
            /*
             TODO this must be a bug in typeorm
             { ip0: '192.0.0.1', port0: 3129 }
             { ip0: '127.0.1.1', port0: 3128 }
             [ 'SELECT "addr"."id" AS "addr_id", "addr"."ip" AS "addr_ip", "addr"."port" AS "addr_port", "addr"."blocked" AS "addr_blocked", "addr"."last_checked" AS "addr_last_checked", "addr"."created_at" AS "addr_created_at", "addr"."updated_at" AS "addr_updated_at" FROM "ip_addr" "addr" WHERE ("addr"."ip" = $1 and "addr"."port" = $2) OR ("addr"."ip" = $3 and "addr"."port" = $4)',
             [ '127.0.1.1', 3128, '127.0.1.1', 3128 ] ]

             let k = null
             let data:any = {}
             k = 'ip'+i
             data[k] = _proxy_ip.ip
             k = 'port'+i
             data[k] = _proxy_ip.port
             console.log(data)
             */
            cqb = cqb.orWhere(`(addr.ip = "${_proxy_ip.ip}" and addr.port = ${_proxy_ip.port})`)
        })
        // console.log(cqb.getSqlWithParameters())

        // check the ips
        let entries = await cqb.getMany()
        let proxyData: ProxyData[] = []

        for (let _x of workLoad) {

            let recordExists = _.find(entries, _x)
            console.log(_x, recordExists)
            let pd = new ProxyData(_x)
            if (recordExists) {
                // todo if has error
                pd.record = Utils.clone(recordExists)

                if ((now.getTime() - self.recheck_after) > recordExists.last_checked.getTime()) {
                    // last check is longer then the recheck offset, so revalidate


                } else {
                    // last check was within recheck offset


                }
            } else {
                // new record entry must be checked

            }
        }


        //let em = conn.connection.entityManager
        //await em.find()


        await conn.close()
        return Promise.resolve()
    }

    // TODO need a functional
    onEmpty(): Promise<void> {
        console.log('DONE?')
        return null;
    }

}