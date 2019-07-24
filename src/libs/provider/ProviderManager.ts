import * as _ from 'lodash';
import {IProviderVariantId} from './IProviderVariantId';
import {DEFAULT_PROVIDER_OPTIONS, IProviderOptions} from './IProviderOptions';
import {IProviderDef} from './IProviderDef';
import {IProvider} from './IProvider';
import {ProviderWorker} from './ProviderWorker';
import {ClassType} from 'commons-http/libs/Constants';
import {AbstractProvider} from './AbstractProvider';
import {__ALL__} from '../Constants';


export class ProviderManager /* implements IQueueProcessor<IProviderVariantId> */ {

  static NAME: string = ProviderManager.name;

  options: IProviderOptions = {};

  // @Inject('storage.default')
  // storage: StorageRef;

  // queue: AsyncWorkerQueue<IProviderVariantId>;

  providers: IProviderDef[] = [];

  // jobs: Job[] = [];

  // cron: any;
  //
  // timer: Timer = null;
  //
  // last: Date = null;
  //
  // next: Date = null;


  async prepare(/*storageRef: StorageRef,*/ options: IProviderOptions = {}, override: boolean = false): Promise<void> {
    // await EventBus.register(this);

    // this.storage = storageRef;

    if (override) {
      this.options = _.clone(options);
    } else {
      this.options = _.defaults(options, DEFAULT_PROVIDER_OPTIONS);
    }

    // this.options.parallel = this.options.parallel || 5;
    // this.queue = new AsyncWorkerQueue<IProviderVariantId>(this, {
    //   name: 'provider_manager',
    //   concurrent: this.options.parallel
    // });

    // if (this.options.schedule && this.options.schedule.enable) {
    //   try {
    //     this.cron = (await import('cron-parser')).parseExpression(this.options.schedule.pattern);
    //   } catch (e) {
    //     Log.error(e);
    //   }
    // }

    // await this.initJobs();
    // this.checkSchedule();
  }


  addProviderClass(clazz: ClassType<AbstractProvider>) {
    const tmp = this.newProviderFromObject(clazz);
    if (tmp.variants) {
      tmp.variants.forEach(_variant => {
        const proxyDef: IProviderDef = {
          name: tmp.name,
          url: tmp.url,
          clazz: clazz,
          ..._variant
        };
        this.providers.push(proxyDef);
      });
    } else {
      const proxyDef: IProviderDef = {
        name: tmp.name,
        url: tmp.url,
        type: 'all',
        clazz: clazz
      };
      this.providers.push(proxyDef);
    }
  }


  // private async initJobs(): Promise<void> {
  //   let conn: ConnectionWrapper = null;
  //   let jobs: Job[] = [];
  //   if (this.storage) {
  //
  //     conn = await this.storage.connect();
  //     // set all jobs inactive
  //     await conn.manager.createQueryBuilder<Job>(Job, 'job').update({active: false}).execute();
  //     jobs = await conn.manager.find(Job);
  //   }
  //
  //
  //   for (const provider of this.providers) {
  //     let job = _.find(jobs, {name: provider.name, type: provider.type});
  //     if (!job) {
  //       // create new one
  //       job = new Job();
  //       // TODO map data
  //       job.name = provider.name;
  //       job.type = provider.type;
  //       job.enabled = true;
  //     }
  //     job.active = true;
  //     job.data = <any>_.clone(provider);
  //     this.jobs.push(job);
  //   }
  //
  //   if (conn) {
  //     this.jobs = await conn.manager.save(this.jobs);
  //     await conn.close();
  //   }
  //
  //   return Promise.resolve();
  // }

  // @subscribe(ProviderRunEvent)
  // run(c: ProviderRunEvent): void {
  //   if (c.runAll()) {
  //     for (const v of this.providers) {
  //       Log.info(`provider manager: recheck provider ${v.name}:${v.type}`);
  //       this.queue.push({name: v.name, type: v.type});
  //     }
  //   } else {
  //     for (const v of c.variants) {
  //       Log.info(`provider manager: recheck provider ${v.name}:${v.type}`);
  //       this.queue.push({name: v.name, type: v.type});
  //     }
  //   }
  // }
  //

  // async status(): Promise<any> {
  //
  //
  //   return {
  //     last_scheduled: this.last,
  //     next_schedule: this.next,
  //     queue: this.queue.status(),
  //
  //   };
  // }


  // async list(): Promise<any> {
  //   const data: any = [];
  //
  //   const c = await this.storage.connect();
  //   const q = c.manager.createQueryBuilder(JobState, 'state');
  //   q.innerJoin(Job, 'job', 'job.last_state_id = state.id');
  //   const list = await q.getMany();
  //   await c.close();
  //
  //   for (const value of this.jobs) {
  //     const y: any = _.clone(value);
  //     y.state = _.find(list, {job_id: y.id});
  //     data.push(y);
  //   }
  //
  //   return data;
  // }


  // /**
  //  * Implementation of queue processor method
  //  *
  //  * @param workLoad
  //  * @returns {null}
  //  */
  // async do(q: IProviderVariantId): Promise<JobState> {
  //   const _defs = this.get(q);
  //   let addrs: IProxyData[] = null;
  //   let jobState = new JobState();
  //
  //   if (_.isUndefined(_defs.job) || _.isUndefined(_defs.variant)) {
  //     throw new Error('no job or variant found');
  //   }
  //
  //   const job = _defs.job;
  //   const variant = _defs.variant;
  //
  //
  //   try {
  //     jobState.job_id = job.id;
  //     jobState.name = job.name;
  //     jobState.type = job.type;
  //     jobState.start = new Date();
  //
  //     const worker = await this.createWorker(variant);
  //     addrs = await worker.fetch();
  //     jobState.count = addrs.length;
  //   } catch (err) {
  //     err = Exceptions.handle(err);
  //     jobState.error_message = err.message;
  //     jobState.error_code = err.code;
  //     Log.error(err);
  //   }
  //
  //   jobState.stop = new Date();
  //   jobState.duration = jobState.stop.getTime() - jobState.start.getTime();
  //
  //   if (this.storage) {
  //     const c = await this.storage.connect();
  //     jobState = await c.manager.save(jobState);
  //     job.last_state_id = jobState.id;
  //     await c.manager.save(job);
  //     await c.close();
  //   }
  //
  //   if (addrs && addrs.length > 0) {
  //     const event = new ProxyDataFetchedEvent(addrs, jobState);
  //     await EventBus.post(event);
  //   }
  //
  //   return jobState;
  // }
  //

  get(q: IProviderVariantId | { name: string, type?: string }): IProviderDef /* { job: Job, variant: IProviderDef } */ {
    if (!q.type) {
      q.type = __ALL__;
    }

    const variant = <IProviderDef>_.find(this.providers, q);
    // const job = <Job>_.find(this.jobs, q);

    // return {job: job, variant: variant};
    return variant;
  }


  // private async saveJobs(): Promise<void> {
  //   const conn = await this.storage.connect();
  //   this.jobs = await conn.manager.save(this.jobs);
  //   await conn.close();
  //   return Promise.resolve();
  // }

  //
  // private checkSchedule(): void {
  //   if (this.options.schedule && this.options.schedule.enable) {
  //     this.last = this.next;
  //     const now = new Date();
  //     const next = this.cron.next();
  //     const offset = next.getTime() - now.getTime();
  //     this.next = new Date(next.getTime());
  //     Log.info('provider manager: next scheduled reload on ' + this.next);
  //     this.timer = setTimeout(this.runScheduled.bind(this), offset);
  //   }
  // }
  //
  //
  // private runScheduled() {
  //   EventBus.post(new ProviderRunEvent([])).catch(e => {
  //   });
  //   clearTimeout(this.timer);
  //   this.checkSchedule();
  // }


  private newProviderFromObject(obj: Function): IProvider {
    return Reflect.construct(obj, []);
  }


  findAll(query: { [_k: string]: string } = {}): IProviderDef[] {
    const ret: Array<IProviderDef> = [];
    for (const value of this.providers) {
      let _value = true;

      _.keys(query).forEach(k => {
        if (value[k] && query[k] &&
          (value[k].localeCompare(query[k]) === 0 ||
            query[k] === __ALL__)) {
          _value = _value && true;
        } else {
          _value = _value && false;
        }
      });

      if (_value) {
        // value.job = _.find(this.jobs, {name: value.name, type: value.type});
        ret.push(value);
      }
    }
    return ret;
  }


  async createWorker(provider: IProviderDef): Promise<ProviderWorker> {
    const pw = new ProviderWorker(this, provider);
    await pw.initialize();
    return pw;
  }


  // async await(): Promise<void> {
  //   return this.queue.await();
  // }


  async shutdown() {
    // await EventBus.unregister(this);
    // clearTimeout(this.timer);
    // await this.await();
    // await this.saveJobs();

  }

}
