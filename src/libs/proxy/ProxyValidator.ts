import {Judge} from '../judge/Judge';
import {ProxyData} from './ProxyData';
import * as _ from 'lodash';
import {JudgeResult} from '../judge/JudgeResult';
import {DEFAULT_VALIDATOR_OPTIONS, IProxyValidatiorOptions} from './IProxyValidatiorOptions';
import {ValidatorRunEvent} from './ValidatorRunEvent';
import {DateUtils} from 'typeorm/util/DateUtils';
import {AsyncWorkerQueue, ConnectionWrapper, ILoggerApi, IQueueProcessor, Log, PlatformUtils, QueueJob, StorageRef} from '@typexs/base';
import {subscribe} from 'commons-eventbus/decorator/subscribe';
import {IpAddr} from '../../entities/IpAddr';
import {EventBus} from 'commons-eventbus';
import {IpAddrState} from '../../entities/IpAddrState';
import {IpLoc} from '../../entities/IpLoc';
import {E_EMPTY_FINISHED} from '../Constants';
import {ProxyDataValidateEvent} from '../../event/ProxyDataValidateEvent';


const PROXY_VALIDATOR = 'proxy_validator';

export class ProxyValidator implements IQueueProcessor<ProxyData> {

  static NAME = ProxyValidator.name;

  options: IProxyValidatiorOptions;

  storage: StorageRef;

  connection: ConnectionWrapper;

  queue: AsyncWorkerQueue<ProxyData>;

  judge: Judge;

  _isEmpty = true;

  logger: ILoggerApi;

  static buildState(addr: IpAddr, result: JudgeResult): IpAddrState {
    const state = new IpAddrState();
    state.addr_id = addr.id;
    state.validation_id = addr.validation_id;
    state.level = result.level;
    state.protocol_src = result.protocol_from;
    state.protocol_dest = result.protocol_to;
    state.enabled = false;

    if (result.hasError) {
      state.error_code = result.error.code;
      state.error_message = result.error.message;
    } else {
      state.error_code = null;
      state.error_message = null;
      if (state.level > -1) {
        state.enabled = true;
      }
    }

    state.log = result.logToString();
    state.duration = result.duration;
    state.start = result.start;
    state.stop = result.stop;

    if (state.enabled) {
      addr.addSourceProtocol(result.protocol_from);
      addr.addProtocol(result.protocol_to);
    }

    return state;
  }


  initialize(options: IProxyValidatiorOptions, storage: StorageRef) {
    this.options = _.defaultsDeep(options, DEFAULT_VALIDATOR_OPTIONS);

    this.storage = storage;
    this.queue = new AsyncWorkerQueue<ProxyData>(this, {
      name: PROXY_VALIDATOR,
      concurrent: this.options.parallel || 200
    });
    this.queue.setMaxListeners(10000);

    this.logger = _.get(options, 'logger', Log.getLoggerFor(ProxyValidator));
  }


  async prepare(): Promise<boolean> {
    await EventBus.register(this);
    this.judge = new Judge(this.options.judge);
    const booted = await this.judge.prepare();
    return booted;
  }


  @subscribe(ValidatorRunEvent)
  async run(e: ValidatorRunEvent) {
    const c = await this.storage.connect();
    const q = c.manager.getRepository(IpAddr).createQueryBuilder('ip');

    const td = Date.now() - this.options.revalidate.time_distance * 1000;
    q.where('ip.blocked = :blocked and ip.to_delete = :to_delete and ' +
      '(ip.last_checked_at is null OR ip.last_checked_at < :date) ', {
      blocked: false,
      to_delete: false,
      date: DateUtils.mixedDateToDatetimeString(new Date(td))
    })
      .limit(this.options.revalidate.limit);

    try {
      const ips: IpAddr[] = await q.getMany();
      this.logger.info('Validator recheck proxies: ' + ips.length);
      if (ips.length > 0) {
        for (const ip of ips) {
          this.validate(new ProxyDataValidateEvent(new ProxyData(ip)));
        }
      }
    } catch (e) {
      this.logger.error(e);
    }
    await c.close();
  }


  async store(proxyData: ProxyData) {
    const conn = this.connection;
    const now = new Date();

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

    if (proxyData.results) {

      // check if IpLoc exists then update it else create a new entry
      let ip_loc = await conn.manager.findOne(IpLoc, {where: {ip: proxyData.ip}});
      if (!ip_loc) {
        ip_loc = new IpLoc();
      }

      if (proxyData.results.geo) {
        const geo = proxyData.results.geoData;
        if (geo.lat && geo.lon) {
          ip_loc.ip = proxyData.ip;

          ip_loc.city = geo.city;
          ip_loc.longitude = geo.lon;
          ip_loc.latitude = geo.lat;
          ip_loc.country_code = geo.countryCode;
          ip_loc.country_name = geo.country;
          ip_loc.region_code = geo.region;
          ip_loc.region_name = geo.regionName;
          ip_loc.zip_code = geo.zip;
          ip_loc.time_zone = geo.timezone;

          try {
            await conn.save(ip_loc);
          } catch (err) {
            this.logger.error(err);
          }
        } else {
          this.logger.warn('proxy_validator: no geodata found');
        }
      }
      // if we have no positive results for http and https then
      //     if record already exists then
      //         set update_at and last_error_at to now
      //     else
      //         insert record with last_checked and last_success_at = null and last_error_at = now
      //     finally
      //         add


      let enabled = false;

      const promises = [];
      for (const res of proxyData.results.getVariants()) {
        // let _http = proxyData.results.http;
        http_state = ProxyValidator.buildState(ip_addr, res);
        enabled = enabled || http_state.enabled;
        promises.push(conn.save(http_state));
      }

      await Promise.all(promises);

      if (enabled) {
        // event.jobState.validated++;
        ip_addr.count_success++;
        ip_addr.count_errors = 0;
        ip_addr.errors_since_at = null;

        if (!ip_addr.success_since_at) {
          ip_addr.success_since_at = now;
        }
      } else {
        // event.jobState.broken++;
        ip_addr.count_success = 0;
        ip_addr.count_errors++;

        ip_addr.success_since_at = null;
        if (!ip_addr.errors_since_at) {
          ip_addr.errors_since_at = now;
        }
      }

      this.logger.debug('proxy_validator: validated ' + ip_addr.ip);
      await conn.save(ip_addr);

    }
    // await conn.close();

  }

  @subscribe(ProxyDataValidateEvent)
  async validate(event: ProxyDataValidateEvent): Promise<any> {
    const queueJob = await this.push(event.data);
    await queueJob.done();
    // queueJob.workload();
    return event;
  }


  async push(o: ProxyData): Promise<QueueJob<ProxyData>> {
    this._isEmpty = false;
    return this.queue.push(o);
  }


  async await(): Promise<void> {
    if (this.queue.amount() > 0 || this.judge.isEnabled()) {
      return this.queue.await();
    } else {
      return Promise.resolve();
    }
  }


  async shutdown() {
    this.logger.debug('proxy_validator:  pre-shutdown');
    if (this.judge.isEnabled()) {
      await this.judge.pending();
    }
    this.queue.removeAllListeners();
    await EventBus.unregister(this);
    this.logger.debug('proxy_validator:  shutdown');
  }


  async do(workLoad: ProxyData): Promise<any> {
    // If starting or stopping judge server then wait
    await this.judge.progressing();
    if (!this.judge.isEnabled()) {
      try {
        await this.judge.wakeup();
        this.connection = await this.storage.connect();
      } catch (err) {
        this.logger.error(err);
        throw err;
      }
    }

    this.logger.debug('before validate of ' + workLoad.ip + ':' + workLoad.port);

    const results = await this.judge.validate(workLoad.ip, workLoad.port);
    workLoad.results = results;


    const status = this.queue.status();
    const out = ['enq=' + status.enqueued, 'run=' + status.running, 'act=' + status.active,
      'don=' + status.done, 'all=' + status.all].join(', ');
    this.logger.info('validated ' + workLoad.ip + ':' + workLoad.port + ' [' + out + '] [\n\t' +
      results.variants.map(x => '(' + [x.protocol_to, x.protocol_to, x.hasError, x.level, x.duration].join(',') + ')')
        .join('\n\t') + '\n]');

    if (this.storage) {
      const hasSuccess = !!_.find(results.getVariants(), x => !x.hasError);
      if ((this.options.skipFailed && hasSuccess) || !this.options.skipFailed) {
        await this.store(workLoad);
      }

    }
    return results;
  }


  async onEmpty(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    if (this.judge.isEnabled()) {
      await this.judge.pending();
    }
    this.queue.emit(E_EMPTY_FINISHED);
    this._isEmpty = true;
  }


  async isEmpty() {
    if (this._isEmpty) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      this.queue.once(E_EMPTY_FINISHED, () => {
        resolve();
      });
    });
  }

}
