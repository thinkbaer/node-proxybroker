import * as _ from 'lodash'

import subscribe from "../events/decorator/subscribe"
import {ProxyDataFetchedEvent} from "./ProxyDataFetchedEvent";
import {Storage} from "../storage/Storage";

import {IQueueProcessor} from "../queue/IQueueProcessor";

import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import {IpAddr} from "../model/IpAddr";
import {ProxyData} from "./ProxyData";

import DomainUtils from "../utils/DomainUtils";
import {ProxyDataValidateEvent} from "./ProxyDataValidateEvent";
import {ProxyDataFetched} from "./ProxyDataFetched";

export class ProxyDataSelector implements IQueueProcessor<ProxyDataFetched> {

    // TODO make this configurable
    chunk_size: number = 50;

    // TODO make this configurable
    // TODO Idea: make config annotation in commons-config @config('path.to.value',fallback value)
    recheck_after: number = 24 * 60 * 60 * 1000;

    storage: Storage;

    queue: AsyncWorkerQueue<ProxyDataFetched>;


    constructor(storage: Storage) {
        let parallel = 200;
        this.storage = storage;
        this.queue = new AsyncWorkerQueue<ProxyDataFetched>(this, {name:'proxy_data_selector',concurrent: parallel})
    }

    @subscribe(ProxyDataFetchedEvent)
    async filter(fetched: ProxyDataFetchedEvent): Promise<void> {
        // - verify if the address and port are correct
        let proxy = [];
        for (let addr of fetched.list) {
            if (DomainUtils.IP_REGEX.test(addr.ip) && 0 < addr.port && addr.port <= 65536) {
                // addr.job_state_id = fetched.jobState.id
                proxy.push(addr);
                fetched.jobState.selected++
            } else {
                fetched.jobState.skipped++
            }
        }

        // - chunk the array and push to worker queue
        let entries = _.chunk(proxy, this.chunk_size);
        while (entries.length > 0) {
            let entry = new ProxyDataFetched(entries.shift(), fetched.jobState);
            this.queue.push(entry)
        }
    }

    async await(): Promise<void> {
        return this.queue.await()
    }


    async do(workLoad: ProxyDataFetched): Promise<any> {
        let self = this;

        // get existing entries
        let now = new Date();
        let conn = await this.storage.connect();
        let qb = conn.connection.getRepository(IpAddr);
        let cqb = qb.createQueryBuilder('addr');
        cqb = cqb.select();
        let i = 0;
        workLoad.list.forEach(_proxy_ip => {
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
        });

        // check the ips
        let entries = await cqb.getMany();
        let events: ProxyDataValidateEvent[] = [];

        for (let _x of workLoad.list) {

            let recordExists = _.find(entries, _x);
            let proxyData = new ProxyData(_x);
            let proxyDataValidateEvent = new ProxyDataValidateEvent(proxyData, workLoad.jobState);

            if (recordExists) {

                // if manuell blocked then skip this entry
                if (recordExists.blocked || recordExists.to_delete) {
                    workLoad.jobState.blocked++;
                    continue;
                }

                proxyDataValidateEvent.record = recordExists;

                if (!recordExists.last_checked_at || ((now.getTime() - self.recheck_after) > recordExists.last_checked_at.getTime())) {
                    // last check is longer then the recheck offset, so revalidate
                    proxyDataValidateEvent.fire();
                    workLoad.jobState.updated++
                } else {
                    // last check was within recheck offset, so ignore validation
                    workLoad.jobState.skipped++

                }
            } else {
                // new record entry must be checked
                workLoad.jobState.added++;
                proxyDataValidateEvent.fire()
            }

            if (proxyDataValidateEvent.fired) {
                events.push(proxyDataValidateEvent)
            }
        }

        await conn.close();
        return Promise.resolve(events)
    }

    // TODO need a functional
    /*
     onEmpty(): Promise<void> {
     console.log('DONE?')
     return null;
     }
     */
}