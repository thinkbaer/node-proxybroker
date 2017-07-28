import subscribe from "../events/decorator/subscribe"

import {clearTimeout, setTimeout} from "timers";

import {Judge} from "../judge/Judge";
import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import {ProxyData} from "./ProxyData";

import {IQueueProcessor} from "../queue/IQueueProcessor";
import {QueueJob} from "../queue/QueueJob";
import {ProxyDataValidateEvent} from "./ProxyDataValidateEvent";
import TodoException from "../exceptions/TodoException";
import {Storage} from "../storage/Storage";
import {IpLoc} from "../model/IpLoc";
import {IpAddrState} from "../model/IpAddrState";
import {IpAddr} from "../model/IpAddr";
import {JudgeResult} from "../judge/JudgeResult";

import {Utils} from "../utils/Utils";
import {Log} from "../lib/logging/Log";
import {DEFAULT_VALIDATOR_OPTIONS, IProxyValidatiorOptions} from "./IProxyValidatiorOptions";


import {Runtime} from "../lib/Runtime";
import {ValidatorRunEvent} from "./ValidatorRunEvent";
import {DateUtils} from "typeorm/util/DateUtils";
import Timer = NodeJS.Timer;


const PROXY_VALIDATOR = 'proxy_validator'

export class ProxyValidator implements IQueueProcessor<ProxyData> {

    options: IProxyValidatiorOptions

    storage: Storage;

    wakeuped: boolean = false;

    queue: AsyncWorkerQueue<ProxyData>;

    judge: Judge;

    cron: any;

    timer: Timer = null;

    next: Date = null;

    constructor(options: IProxyValidatiorOptions, storage: Storage) {
        this.options = Utils.merge(DEFAULT_VALIDATOR_OPTIONS, options);
        this.storage = storage;
        this.queue = new AsyncWorkerQueue<ProxyData>(this, {
            name: PROXY_VALIDATOR,
            concurrent: this.options.parallel || 200
        })

        if (this.options.schedule && this.options.schedule.enable) {
            this.cron = require('cron-parser').parseExpression(this.options.schedule.pattern)
        }


        Runtime.$().setConfig('validator', this.options)

    }


    async prepare(): Promise<boolean> {
        this.judge = new Judge(this.options.judge);
        let booted = await this.judge.bootstrap();
        this.checkSchedule()
        return Promise.resolve(booted);
    }


    private checkSchedule(): void {
        if (this.options.schedule && this.options.schedule.enable) {
            let now = new Date();
            let next = this.cron.next();
            let offset = next.getTime() - now.getTime();
            this.next = new Date(next.getTime());
            Log.info('Validator scheduled for '+ this.next)
            this.timer = setTimeout(this.runScheduled.bind(this), offset);
        }
    }


    private runScheduled() {
        (new ValidatorRunEvent()).fire();
        clearTimeout(this.timer);
        this.checkSchedule();
    }


    @subscribe(ValidatorRunEvent)
    async run(e: ValidatorRunEvent) {
        let c = await this.storage.connect()
        let q = c.manager.getRepository(IpAddr).createQueryBuilder('ip')

        let td = Date.now() - this.options.schedule.time_distance * 1000
        q.where('ip.blocked = :blocked and ip.to_delete = :to_delete and ' +
            '(ip.last_checked_at is null OR ip.last_checked_at < :date) ', {
            blocked:false,
            to_delete:false,
            date: DateUtils.mixedDateToDatetimeString(new Date(td))
        })
            .limit(this.options.schedule.limit)

        try {

            let ips: IpAddr[] = await q.getMany()
            Log.info('Validator recheck proxies: '+ ips.length)
            if (ips.length > 0) {
                for (let ip of ips) {
                    (new ProxyDataValidateEvent(new ProxyData(ip))).fire()
                }
            }
        } catch (e) {
            Log.error(e);
        }
    }


    static buildState(addr: IpAddr, result: JudgeResult): IpAddrState {
        let state = new IpAddrState();
        state.addr_id = addr.id;
        state.validation_id = addr.validation_id;
        state.level = result.level;
        state.protocol = result.protocol;

        if (result.hasError()) {
            state.error_code = result.error.code;
            state.error_message = result.error.message;
            state.enabled = false
        } else {
            state.error_code = null;
            state.error_message = null;
            if (state.level > -1) {
                state.enabled = true
            }
        }

        state.log = result.log;
        state.duration = result.duration;
        state.start = result.start;
        state.stop = result.stop;

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

        let queueJob = await this.push(event.data);
        queueJob = await queueJob.done();
        let proxyData = queueJob.workload();

        let storage = this.storage;
        // results are present
        let conn = await storage.connect();
        let now = Utils.now();

        let ip_addr = await conn.manager.findOne(IpAddr, {ip: proxyData.ip, port: proxyData.port});

        if (!ip_addr) {
            ip_addr = new IpAddr();
            ip_addr.ip = proxyData.ip;
            ip_addr.port = proxyData.port;
            ip_addr.validation_id = 0;
        }

        // increment the state identifier
        ip_addr.validation_id += 1;
        ip_addr.last_checked_at = now;
        ip_addr = await conn.save(ip_addr);

        let http_state: IpAddrState = null;
        let https_state: IpAddrState = null;

        if (proxyData.results) {


            // check if IpLoc exists then update it else create a new entry
            let ip_loc = await conn.manager.findOne(IpLoc, {where: {ip: proxyData.ip}});

            if (!ip_loc) {
                ip_loc = new IpLoc();
            }

            let props = ['ip', 'country_code', 'country_name',
                'region_code', 'region_name', 'city', 'zip_code',
                'time_zone', 'metro_code', 'latitude', 'longitude'];

            for (let k of props) {
                ip_loc[k] = proxyData.results[k];
            }

            try {
                await conn.save(ip_loc);
            } catch (err) {
                Log.error(err)
            }
            // if we have no positive results for http and https then
            //     if record already exists then
            //         set update_at and last_error_at to now
            //     else
            //         insert record with last_checked and last_success_at = null and last_error_at = now
            //     finally
            //         add

            if (proxyData.results.http) {
                let _http = proxyData.results.http;
                http_state = ProxyValidator.buildState(ip_addr, _http);
                await conn.save(http_state)
            }

            if (proxyData.results.https) {
                let _http = proxyData.results.https;
                https_state = ProxyValidator.buildState(ip_addr, _http);
                await conn.save(https_state)
            }

            if (http_state.enabled || https_state.enabled) {
                event.jobState.validated++;
                ip_addr.count_success++;
                ip_addr.count_errors = 0;
                ip_addr.errors_since_at = null

                if (!ip_addr.success_since_at) {
                    ip_addr.success_since_at = now
                }
            } else {
                event.jobState.broken++;
                ip_addr.count_success = 0;
                ip_addr.count_errors++;

                ip_addr.success_since_at = null
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

        await conn.close();

        return Promise.resolve(event)
    }


    async push(o: ProxyData): Promise<QueueJob<ProxyData>> {
        let enque = this.queue.push(o);
        return enque;
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
        await this.judge.progressing();

        if (!this.judge.isEnabled()) {
            try {
                this.wakeuped = await this.judge.wakeup()
            } catch (err) {
                Log.error(err);
                throw err
            }
        }

        let results = await this.judge.validate(workLoad.ip, workLoad.port);
        workLoad.results = results;
        return Promise.resolve(results)
    }


    async onEmpty(): Promise<void> {
        Log.info('queue['+this.queue.options.name+'] is empty stop judge');
        await this.judge.pending();
        return Promise.resolve();
    }

}