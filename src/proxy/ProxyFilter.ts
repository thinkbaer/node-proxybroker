import * as _ from 'lodash'

import subscribe from "../libs/generic/events/decorator/subscribe"
import {ProxyDataFetchedEvent} from "./ProxyDataFetchedEvent";
import {Storage} from "../libs/generic/storage/Storage";

import {IQueueProcessor} from "../libs/generic/queue/IQueueProcessor";

import {AsyncWorkerQueue} from "../libs/generic/queue/AsyncWorkerQueue";
import {IpAddr} from "../entities/IpAddr";
import {ProxyData} from "./ProxyData";

import DomainUtils from "../libs/generic/utils/DomainUtils";
import {ProxyDataValidateEvent} from "./ProxyDataValidateEvent";
import {ProxyDataFetched} from "./ProxyDataFetched";


const PROXY_FILTER_NAME = 'proxy_filter'

export class ProxyFilter implements IQueueProcessor<ProxyDataFetched> {

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
        this.queue = new AsyncWorkerQueue<ProxyDataFetched>(this, {name:PROXY_FILTER_NAME,concurrent: parallel})
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

                // proxyDataValidateEvent.record = recordExists;

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

}