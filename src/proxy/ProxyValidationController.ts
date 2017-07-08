import subscribe from "../events/decorator/subscribe"

import {IJudgeOptions} from "../judge/IJudgeOptions";
import {Judge} from "../judge/Judge";
import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import {ProxyData} from "./ProxyData";

import {IQueueProcessor} from "../queue/IQueueProcessor";
import {QueueJob} from "../queue/QueueJob";
import {ProxyDataValidateEvent} from "./ProxyDataValidateEvent";
import TodoException from "../exceptions/TodoException";
import {Storage} from "../storage/Storage";
import {IpLoc} from "../storage/entity/IpLoc";
import {IpAddrState} from "../storage/entity/IpAddrState";
import {IpAddr} from "../storage/entity/IpAddr";
import {JudgeResult} from "../judge/JudgeResult";

import {Utils} from "../utils/Utils";
import {Log} from "../logging/Log";

export class ProxyValidationController implements IQueueProcessor<ProxyData> {

    storage: Storage

    wakeuped: boolean = false

    queue: AsyncWorkerQueue<ProxyData>

    judge: Judge


    constructor(judgeOptions: IJudgeOptions, storage: Storage) {
        let parallel: number = 200
        this.storage = storage
        this.judge = new Judge(judgeOptions)
        this.queue = new AsyncWorkerQueue<ProxyData>(this, {concurrent: parallel})
    }


    buildState(addr: IpAddr, result: JudgeResult): IpAddrState {
        let state = new IpAddrState()
        state.addr_id = addr.id
        state.validation_id = addr.check_id
        state.level = result.level
        state.protocol = result.protocol

        if (result.hasError()) {
            state.error_code = result.error.code
            state.error_message = result.error.message
            state.enabled = false
        } else {
            state.error_code = null
            state.error_message = null
            if (state.level > -1) {
                state.enabled = true
            }
        }

        state.log = result.log
        state.duration = result.duration
        state.start = result.start
        state.stop = result.stop

        if (state.enabled) {
            if (!addr.supportsProtocol(result.protocol)) {
                addr.addProtocol(state.protocol)
            }
        } else {
            if (addr.supportsProtocol(result.protocol)) {
                addr.removeProtocol(state.protocol)
            }
        }
        return state;
    }


    @subscribe(ProxyDataValidateEvent)
    async validate(event: ProxyDataValidateEvent): Promise<any> {

        let queueJob = await this.push(event.data)
        queueJob = await queueJob.done()
        let proxyData = queueJob.workload()

        let storage = this.storage
        // results are present
        let conn = await storage.connect()
        let now = Utils.now()

        let ip_addr = await conn.manager.findOne(IpAddr, {ip: proxyData.ip, port: proxyData.port})

        if (!ip_addr) {
            ip_addr = new IpAddr()
            ip_addr.ip = proxyData.ip
            ip_addr.port = proxyData.port
        }

        // increment the state identifier
        ip_addr.last_checked_at = now
        ip_addr = await conn.save(ip_addr)

        let http_state: IpAddrState = null
        let https_state: IpAddrState = null

        if (proxyData.results) {
            ip_addr.check_id++

            // check if IpLoc exists then update it else create a new entry
            let ip_loc = await conn.manager.findOne(IpLoc, {where: {ip: proxyData.ip}})

            if (!ip_loc) {
                ip_loc = new IpLoc()
            }

            let props = ['ip', 'country_code', 'country_name',
                'region_code', 'region_name', 'city', 'zip_code',
                'time_zone', 'metro_code', 'latitude', 'longitude']

            for (let k of props) {
                ip_loc[k] = proxyData.results[k]
            }

            ip_loc = await conn.save(ip_loc)

            // if we have no positive results for http and https then
            //     if record already exists then
            //         set update_at and last_error_at to now
            //     else
            //         insert record with last_checked and last_success_at = null and last_error_at = now
            //     finally
            //         add

            if (proxyData.results.http) {
                let _http = proxyData.results.http;
                http_state = this.buildState(ip_addr, _http)
                await conn.save(http_state)
            }

            if (proxyData.results.https) {
                let _http = proxyData.results.https;
                https_state = this.buildState(ip_addr, _http)
                await conn.save(https_state)
            }

            if (http_state.enabled || https_state.enabled) {
                event.jobState.validated++
                ip_addr.count_success++
                ip_addr.count_errors = 0

                if (!ip_addr.success_since_at) {
                    ip_addr.success_since_at = now
                }
            } else {
                event.jobState.broken++
                ip_addr.count_success = 0
                ip_addr.count_errors++

                if (!ip_addr.errors_since_at) {
                    ip_addr.errors_since_at = now
                }
            }
            await conn.save(ip_addr)

        } else {
            throw new TodoException()
        }

        if (event.jobState.id) {
            await conn.save(event.jobState)
        }
        await conn.close()

        return Promise.resolve(event)
    }


    async prepare(): Promise<boolean> {
        let booted = await this.judge.bootstrap()
        return Promise.resolve(booted)
    }

    async push(o: ProxyData): Promise<QueueJob<ProxyData>> {
        let enque = this.queue.push(o)
        if (!this.judge.isEnabled()) {
            try {
                this.wakeuped = await this.judge.wakeup()
            } catch (err) {
                Log.error(err)
                throw err
            }
        }
        return enque
    }

    async await(): Promise<void> {
        if (this.queue.amount() > 0 || this.judge.isEnabled()) {
            return this.queue.await()
        } else {
            return Promise.resolve()
        }
    }

    async shutdown() {
        if (this.judge.isEnabled()) {
            this.wakeuped = await this.judge.pending()
        }
    }

    async do(workLoad: ProxyData): Promise<any> {
        // If starting or stopping judge server then wait
        await this.judge.progressing()

        if(this.judge.isEnabled()){
            let results = await this.judge.validate(workLoad.ip, workLoad.port)
            workLoad.results = results
            return Promise.resolve(results)
        }else{
            Log.error('Judge is not started!')
            return Promise.resolve()
        }
    }


    onEmpty(): Promise<void> {
        this.judge.pending()
        return null;
    }

}