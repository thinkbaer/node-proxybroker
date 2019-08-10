import * as _ from 'lodash';
import {DEFAULT_ROTATOR_OPTIONS, IProxyRotatorOptions} from './IProxyRotatorOptions';
import {
  AsyncWorkerQueue,
  C_STORAGE_DEFAULT,
  ConnectionWrapper,
  CryptUtils,
  ILoggerApi,
  Inject,
  IQueueProcessor,
  Log,
  StorageRef
} from '@typexs/base';
import {IpRotate} from '../../entities/IpRotate';
import {IpAddr} from '../../entities/IpAddr';
import {IpAddrState} from '../../entities/IpAddrState';
import {IpLoc} from '../../entities/IpLoc';
import {ProtocolType} from '../specific/ProtocolType';
import {IProxyRotator} from './IProxyRotator';
import {IProxySelector} from './IProxySelector';
import {IpRotateLog} from '../../entities/IpRotateLog';
import {ProxyUsed} from './ProxyUsed';
import {HttpFactory, IHttp} from 'commons-http';

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
//
// interface IProxy {
//   ip: string;
//   port: number;
//   secured: boolean;
//   level: number;
//   used?: Date;
// }
//
// interface IFetch {
//   limit: number;
// }


const BASEURL = 'httpbin.org/get';
const E_FETCH_DONE = 'fetch_done';

export class ProxyRotator implements IProxyRotator, IQueueProcessor<IpAddr | IProxySelector | ProxyUsed> {

  static NAME = ProxyRotator.name;

  options: IProxyRotatorOptions;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  connection: ConnectionWrapper;

  queue: AsyncWorkerQueue<any>;

  activeList: IpAddr[] = [];

  http: IHttp;

  logger: ILoggerApi;

  fetchRequests = {};

  async prepare(opts: IProxyRotatorOptions) {
    this.options = _.defaultsDeep(opts, DEFAULT_ROTATOR_OPTIONS);
    this.http = HttpFactory.create();
    this.logger = Log.getLoggerFor(ProxyRotator);
    this.queue = new AsyncWorkerQueue<any>(this, {
      name: 'proxy_rotator_queue',
      concurrent: opts.parallel,
      logger: this.logger
    });
  }


  async do(workLoad: IpAddr | IProxySelector | ProxyUsed): Promise<any> {
    // fetch next entry try query
    if (_.has(workLoad, 'limit')) {
      // this.fetching = true;
      const proxyList = await this.fetch({limit: _.get(workLoad, 'limit', this.options.fetchSize)});
      const rotates = this.attachRotateEntriesToIpAddr(proxyList);
      const connection = await this.connect();
      await connection.manager.save(rotates);
      for (const c of proxyList) {
        if (_.has(workLoad, 'reqId')) {
          _.set(c, 'reqId', workLoad['reqId']);
        }
        this.queue.push(c);
      }
      if (workLoad['reqId']) {
        delete this.fetchRequests[workLoad['reqId']];
      }
    } else if (workLoad instanceof IpAddr) {
      const state = workLoad['state'] as IpAddrState;
      const protocl = state.protocol_src === ProtocolType.HTTP ? 'http' : 'https';
      const protocol_dest = state.protocol_dest === ProtocolType.HTTP ? 'http' : 'https';
      const proxyUrlStr = protocl + '://' + workLoad.ip + ':' + workLoad.port;
      const baseUrlStr = protocol_dest + '://' + BASEURL;
      this.logger.debug('try request to ' + baseUrlStr + ' over ' + proxyUrlStr);
      const used = new ProxyUsed();
      used.ip = workLoad.ip;
      used.port = workLoad.port;
      used.protocol = state.protocol_src;
      used.protocol_dest = state.protocol_dest;
      used.start = new Date();
      try {
        await this.doRequest(baseUrlStr, proxyUrlStr);
        const entry = this.findActiveEntry(used);
        if (!entry) {
          this.activeList.push(workLoad);
        }
        this.logger.debug('request succeed to ' + baseUrlStr + ' over ' + proxyUrlStr + ' active.length=' + this.activeList.length);
        if (workLoad['reqId']) {
          this.queue.emit('success_request_' + workLoad['reqId'], workLoad);
        }
        used.success = true;
        used.statusCode = 200;
      } catch (e) {
        this.logger.debug('request errored to ' + baseUrlStr + ' over ' + proxyUrlStr + ' ' + e.message
          + ' active.length=' + this.activeList.length);
        used.error = e;
        used.statusCode = _.get(e, 'statusCode', null);
      }
      used.stop = new Date();
      used.duration = used.stop.getTime() - used.start.getTime();

      this.log(used, true);
    }
    return null;
  }

  async doRequest(baseUrlStr: string, proxyUrlStr: string) {
    const response = await this.http.get(baseUrlStr, {timeout: this.options.request.timeout, proxy: proxyUrlStr, json: true});
    if (response.statusCode < 200 || response.statusCode >= 400) {
      const err = new Error('wrong status code ' + response.statusCode + ' ' + response.statusMessage);
      _.set(err, 'statusCode', response.statusCode);
      throw err;
    }
  }


  async onEmpty() {
    this.cleanupList();
    this.orderActiveList();
    this.printList('on fetch finished');
  }

  findActiveEntry(ip: ProxyUsed) {
    return this.activeList.find(x =>
      x.ip === ip.ip &&
      x.port === ip.port &&
      x['state'].protocol_dest === ip.protocol_dest
    );
  }

  async doLog(ip: ProxyUsed, test: boolean = false): Promise<IpRotate> {
    this.logger.debug('log ' + ip.ip + ':' + ip.port + ' in ' + ip.duration + 'ms '
      + ' active.length=' + this.activeList.length
      + (ip.error ? ' [Error: ' + ip.error.message + ']' : '')
      + ' src: ' + ip.protocol + ' dest: ' + ip.protocol_dest
    );

    let ipRotate: IpRotate = null;
    const addr = !test ? this.findActiveEntry(ip) : null;
    try {
      const c = await this.connect(); // storageRef.connect();
      const ipAddr = await c.manager.findOne(IpAddr, {ip: ip.ip, port: ip.port});
      if (ipAddr) {
        await c.manager.transaction(async em => {
          ipRotate = await this._doLog(c.manager, ip, ipAddr);
        });

        if (addr) {
          if (ip.success) {
            addr.success++;
            addr.duration_avg = ipRotate.duration_average;
          } else {
            addr.errors++;
          }
        } else {
          this.logger.debug('addr not found ' + ipAddr.key);
        }
      }
    } catch (e) {
      this.logger.error(e);
    }
    return ipRotate;
  }


  private async _doLog(em: any, ip: ProxyUsed, ipAddr: IpAddr) {

    const log = new IpRotateLog();
    log.addr_id = ipAddr.id;
    log.protocol = ip.protocol;
    log.protocol_dest = ip.protocol_dest;
    log.duration = Math.ceil(ip.duration);
    log.success = ip.success;
    log.start = ip.start;
    log.stop = ip.stop;

    // TODO maybe cleanup filename references in paths
    log.error = ip.error ? ip.error.stack : null;
    log.statusCode = ip.statusCode;
    await em.save(log);
    let ipRotate = await em.findOne(IpRotate, {addr_id: ipAddr.id, protocol_src: ip.protocol});
    if (!ipRotate) {
      ipRotate = new IpRotate();
      ipRotate.addr_id = ipAddr.id;
      ipRotate.protocol_src = ip.protocol;
      // ipRotate.inc++;
      // if (ipRotate.inc % 10 === 0) {
      //   ipRotate.used = 0;
      // } else {
      //   ipRotate.used++;
      // }
    }

      ipRotate.inc++;
      if (ipRotate.inc % 10 === 0) {
        ipRotate.used = 0;
      } else {
        ipRotate.used++;
      }

    if (ip.success) {
      ipRotate.duration += ip.duration;
      ipRotate.successes += 1;
      if (ipRotate.duration > 0 && ipRotate.successes > 0) {
        ipRotate.duration_average = Math.ceil(ipRotate.duration / ipRotate.successes);
      }
    } else {
      ipRotate.errors += 1;
    }

    await em.save(ipRotate);
    ipRotate['_log'] = log;

    return ipRotate;
  }


  next(select: IProxySelector = {}): Promise<IpAddr> {
    const proxyFilter = this.parseProxyHeader(select);
    this.logger.debug('next', select, proxyFilter);
    return this.take(proxyFilter);
  }


  calcOdd(_addr: IpAddr) {
    if (_addr.odd % this.options.reuse !== 0 && _addr.used > 0) {
      _addr.odd++;
      return false;
    }
    _addr.odd = 0;
    return true;
  }

  useAddr(addr: IpAddr) {
    addr.odd = 1;
    addr.used++;
  }


  async take(selector: IProxySelector = {}): Promise<IpAddr> {
    this.printList('before iteration');

    const reqId = CryptUtils.shorthash(JSON.stringify(selector));
    let addr: IpAddr = null;

    for (const _addr of this.activeList) {
      // if (_addr.odd % this.options.reuse !== 0 && _addr.odd > 0) {
      //   _addr.odd++;
      //   return false;
      // }
      // _addr.odd = 0;

      if (!this.calcOdd(_addr)) {
        continue;
      }
      if (addr) {
        continue;
      }

      let match = true;
      if (selector) {
        const state = (<IpAddrState>_addr['state']);
        if (selector['speed-limit']) {
          match = match && state.duration <= selector['speed-limit'];
        }
        if (selector.level) {
          match = match && state.level <= selector.level;
        }
        if (selector.ssl) {
          match = match && state.protocol_dest === ProtocolType.HTTPS;
        }
      }
      if (match) {
        addr = _addr;
      }
    }

    this.printList('after iteration');

    this.logger.debug('take address ' + (addr ? addr.key + ' (' +
      addr.used + ',' + addr.success + ',' + addr.errors + ',' +
      addr.duration_avg + ')' : '') + ' amount=' + this.activeList.length
    );

    if (addr) {
      this.useAddr(addr);
      this.orderActiveList();
      return Promise.resolve(addr);
    } else {
      if (!this.fetchRequests[reqId]) {
        this.fetchRequests[reqId] = true;
        this.queue.push({...selector, limit: 50, reqId});
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('cant find proxy address!'));
        }, 5000);
        this.queue.once('success_request_' + reqId, (ipaddr: IpAddr) => {
          this.logger.debug('got success request for proxy url ' + ipaddr.key);
          clearTimeout(timer);
          this.useAddr(ipaddr);
          resolve(ipaddr);
        });
      });
    }
    return null;
  }


  private parseProxyHeader(headers: any) {
    const _headers: IProxySelector = {};
    if (headers) {
      const keys = _.keys(headers);
      keys.forEach(_k => {

        if (/^proxy\\-select/.test(_k)) {
          const kn = _k.replace('proxy-select-', '');
          if (['true', 'false'].indexOf(headers[_k]) > -1) {
            _headers[kn] = headers[_k] === 'true';
          } else if (/\d+/.test(headers[_k])) {
            _headers[kn] = parseInt(headers[_k], 0);
          } else {
            _headers[kn] = headers[_k];
          }
        } else if (_k === 'ssl') {
          _headers[_k] = headers[_k];
        }
      });
    }
    return _headers;
  }


  async connect() {
    if (!this.connection) {
      this.connection = await this.storageRef.connect();
    }
    return this.connection;
  }


  attachRotateEntriesToIpAddr(entries: IpAddr[]) {
    const rotates = [];
    for (const ipaddr of entries) {
      const state = <IpAddrState>ipaddr['state'];
      let iprotate: IpRotate = null;
      if (ipaddr['rotate']) {
        iprotate = ipaddr['rotate'];
      } else {
        iprotate = new IpRotate();
        iprotate.addr_id = ipaddr.id;
        iprotate.protocol_src = state.protocol_src;
      }

      // ipaddr.success = iprotate.successes;
      // iprotate.inc++;
      // if (iprotate.inc % 10 === 0) {
      //   iprotate.used = 0;
      // } else {
      //   iprotate.used++;
      // }

      rotates.push(iprotate);
      ipaddr['rotate'] = iprotate;
    }
    return rotates;
  }


  async fetch(select?: IProxySelector) {
    const c = await this.connect();
    let q = c.manager.createQueryBuilder(IpAddr, 'ip');
    q = q.innerJoinAndMapOne('ip.state', IpAddrState, 'state', 'state.validation_id = ip.validation_id and state.addr_id = ip.id');
    q = q.leftJoinAndMapOne('ip.rotate', IpRotate, 'rotate', 'rotate.addr_id = ip.id and rotate.protocol_src = state.protocol_src');

    if (this.storageRef.dbType === 'postgres') {
      q = q.addOrderBy('rotate.used', 'ASC', 'NULLS FIRST');
      q = q.addOrderBy('state.duration', 'ASC', 'NULLS FIRST');
    } else {
      q = q.addOrderBy('rotate.used', 'ASC');
      q = q.addOrderBy('state.duration', 'ASC');
    }
    q = q.limit(_.get(select, 'limit', 1));

    q = q.where('state.enabled = :enable', {enable: true});
    q = q.andWhere('state.level > :level', {level: 0});

    if (select) {
      if (select.level && select.level > 0) {
        q = q.andWhere('state.level = :level', {level: select.level});
      }
      if (select.country) {
        q = q.innerJoinAndMapOne('ip.location', IpLoc, 'country', 'country.ip = ip.ip and country.port = ip.port');
        q = q.andWhere('country.country_code = :country_code', {country_code: select.country});
      }
      if (select['speed-limit'] && select['speed-limit'] > 0) {
        q = q.andWhere('state.duration < :speed_limit', {speed_limit: select['speed-limit']});
      }
      if (select.ssl) {
        q = q.andWhere('state.protocol_dest = :protocol', {protocol: ProtocolType.HTTPS});
      }
    }
    return await q.getMany();
  }


  log(ip: ProxyUsed, test: boolean = false): Promise<IpRotate> {
    return this.doLog(ip, test);
  }


  async shutdown() {
    this.queue.removeAllListeners();
    if (this.connection) {
      await this.connection.close();
    }
  }


  orderActiveList() {
    this.activeList = _.orderBy(this.activeList,
      ['odd', 'used', 'success', 'duration_avg'],
      ['desc', 'asc', 'desc', 'asc']);
  }


  private printList(ms: string) {
    if (this.options.debug.activeList) {
      const output: string[] = [];
      this.activeList.map((_addr) => {
        output.push(
          `${_addr.key}${' '.repeat(22 - _addr.key.length)}\t${_addr['state'].protocol_dest}\tu=${_addr.used} ` +
          `s=${_addr.success} e=${_addr.errors} o=${_addr.odd} d=${_addr.duration_avg}`);
      });
      this.logger.debug(ms + '\n' + output.join('\n'));
    }
  }


  private cleanupList() {
    const removed = _.remove(this.activeList, (r) => r.used > 2 && r.success < r.errors);
    if (removed.length > 0) {
      this.logger.debug('cleanup active list ' + this.activeList.length + '; removed ' + removed.length);
    }
  }

}
