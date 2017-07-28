import * as _ from "lodash";
import subscribe from "../events/decorator/subscribe";
import {DEFAULT_PROVIDER_OPTIONS, IProviderOptions} from "./IProviderOptions";
import {IProviderDef} from "./IProviderDef";

import {IProvider} from "./IProvider";

import {ProviderWorker} from "./ProviderWorker";

import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import {IQueueProcessor} from "../queue/IQueueProcessor";
import {ClassLoader} from "../utils/ClassLoader";
import {IProxyData} from "../proxy/IProxyData";
import {Utils} from "../utils/Utils";
import {Storage} from "../storage/Storage";
import {Job} from "../model/Job";
import {ConnectionWrapper} from "../storage/ConnectionWrapper";

import {JobState} from "../model/JobState";
import {ProxyDataFetchedEvent} from "../proxy/ProxyDataFetchedEvent";
import {Log} from "../lib/logging/Log";
import Exceptions from "../exceptions/Exceptions";
import {IProviderVariantId} from "./IProviderVariantId";
import {ProviderRunEvent} from "./ProviderRunEvent";

import {clearTimeout, setTimeout} from "timers";
import Timer = NodeJS.Timer;
import {Runtime} from "../lib/Runtime";


const __ALL__ = '_all_';

export class ProviderManager implements IQueueProcessor<IProviderVariantId> {

    options: IProviderOptions = {};

    storage: Storage;

    queue: AsyncWorkerQueue<IProviderVariantId>;

    providers: IProviderDef[] = [];

    jobs: Job[] = [];

    cron: any;

    timer: Timer = null;

    next: Date = null;


    constructor(options: IProviderOptions = {}, storage: Storage = null, override: boolean = false) {
        if (override) {
            this.options = Utils.clone(options)
        } else {
            this.options = Utils.merge(DEFAULT_PROVIDER_OPTIONS, options)
        }
        this.storage = storage;
        this.options.parallel = this.options.parallel || 5;
        this.queue = new AsyncWorkerQueue<IProviderVariantId>(this, {
            name: 'provider_manager',
            concurrent: this.options.parallel
        });

        if (this.options.schedule && this.options.schedule.enable) {
            this.cron = require('cron-parser').parseExpression(this.options.schedule.pattern)
        }

        Runtime.$().setConfig('provider', this.options)
    }
    
    async prepare(): Promise<void> {
        let clazzes = ClassLoader.importClassesFromAny(this.options.providers);

        let self = this;
        let clazzFn = clazzes.map(clazz => {
            return Promise.resolve(clazz).then(_clazz => {
                let tmp = self.newProviderFromObject(_clazz);
                if (tmp.variants) {
                    tmp.variants.forEach(_variant => {
                        let proxyDef: IProviderDef = {
                            name: tmp.name,
                            url: tmp.url,
                            clazz: clazz,
                            ..._variant
                        };
                        self.providers.push(proxyDef)
                    })
                } else {
                    let proxyDef: IProviderDef = {
                        name: tmp.name,
                        url: tmp.url,
                        type: 'all',
                        clazz: clazz
                    };
                    self.providers.push(proxyDef)
                }
            })
        });

        await Promise.all(clazzFn);
        await this.initJobs();
        this.checkSchedule()
    }


    private async initJobs(): Promise<void> {
        let conn: ConnectionWrapper = null;
        let jobs: Job[] = [];
        if (this.storage) {

            conn = await this.storage.connect();
            // set all jobs inactive
            await conn.manager.createQueryBuilder<Job>(Job, "job").update({active: false}).execute();
            jobs = await conn.manager.find(Job)

        }


        for (let provider of this.providers) {
            let job = _.find(jobs, {name: provider.name, type: provider.type});
            if (!job) {
                // create new one
                job = new Job();
                // TODO map data
                job.name = provider.name;
                job.type = provider.type;
                job.enabled = true
            }
            job.active = true;
            job.data = Utils.clone(provider);
            this.jobs.push(job)
        }

        if (conn) {
            this.jobs = await conn.manager.save(this.jobs);
            await conn.close();
        }

        return Promise.resolve()
    }

    @subscribe(ProviderRunEvent)
    run(c: ProviderRunEvent): void {
        if (c.runAll()) {

            for (let v of this.providers) {
                Log.info(`provider manager: recheck provider ${v.name}:${v.type}`)
                this.queue.push({name: v.name, type: v.type})
            }
        } else {
            for (let v of c.variants) {
                Log.info(`provider manager: recheck provider ${v.name}:${v.type}`)
                this.queue.push({name: v.name, type: v.type});
            }
        }
    }

    /**
     * Implementation of queue processor method
     *
     * @param workLoad
     * @returns {null}
     */
    async do(q: IProviderVariantId): Promise<JobState> {
        let _defs = this.get(q);
        let addrs: IProxyData[] = null;
        let jobState = new JobState();
        let job = _defs.job;
        let variant = _defs.variant;

        jobState.job_id = job.id;
        jobState.name = job.name;
        jobState.type = job.type;
        jobState.start = new Date();

        try {
            let worker = await this.createWorker(variant);
            addrs = await worker.fetch();
            jobState.count = addrs.length;
        } catch (err) {
            err = Exceptions.handle(err);
            jobState.error_message = err.message;
            jobState.error_code = err.code;
            Log.error(err);
        }

        jobState.stop = new Date();
        jobState.duration = jobState.stop.getTime() - jobState.start.getTime();

        if (this.storage) {
            let c = await this.storage.connect();
            jobState = await c.manager.save(jobState);
            job.last_state_id = jobState.id;
            await c.manager.save(job);
            await c.close();
        }

        if (addrs && addrs.length > 0) {
            let event = new ProxyDataFetchedEvent(addrs, jobState);
            event.fire();
        }

        return Promise.resolve(jobState)
    }

    get(q: IProviderVariantId | { name: string, type?: string }): { job: Job, variant: IProviderDef } {
        if (!q.type) {
            q.type = __ALL__;
        }

        let variant = _.find(this.providers, q);
        let job = _.find(this.jobs, q);

        return {job: job, variant: variant};
    }

    private async saveJobs(): Promise<void> {
        let conn = await this.storage.connect();
        this.jobs = await conn.manager.save(this.jobs);
        await conn.close();
        return Promise.resolve();
    }

    private checkSchedule(): void {
        if (this.options.schedule && this.options.schedule.enable) {
            let now = new Date();
            let next = this.cron.next();
            let offset = next.getTime() - now.getTime();
            this.next = new Date(next.getTime());
            Log.info('provider manager: next scheduled reload on '+ this.next)
            this.timer = setTimeout(this.runScheduled.bind(this), offset);
        }
    }


    private runScheduled() {
        (new ProviderRunEvent([])).fire();
        clearTimeout(this.timer);
        this.checkSchedule();
    }


    private newProviderFromObject(obj: Function): IProvider {
        return ClassLoader.createObjectByType<IProvider>(obj);
    }


    findAll(query: { [_k: string]: string } = {}): IProviderDef[] {
        let ret: Array<IProviderDef> = [];
        for (let value of this.providers) {
            let _value: boolean = true;

            Object.keys(query).forEach(k => {
                if (value[k] && query[k] && (value[k].localeCompare(query[k]) == 0 || value[k] === __ALL__)) {
                    _value = _value && true;
                } else {
                    _value = _value && false;
                }
            });

            if (_value) {
                value.job = _.find(this.jobs, {name: value.name, type: value.type});
                ret.push(value);
            }
        }
        ;
        return ret;
    }


    async createWorker(provider: IProviderDef): Promise<ProviderWorker> {
        let pw = new ProviderWorker(this, provider);
        await pw.initialize();
        return pw
    }


    async await(): Promise<void> {
        return this.queue.await();
    }


    async shutdown() {
        clearTimeout(this.timer);
        await this.await();
        await this.saveJobs()

    }

}