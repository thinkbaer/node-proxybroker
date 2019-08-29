import * as _ from 'lodash';
import {DEFAULT_ROTATOR_OPTIONS, IProxyRotatorOptions} from './IProxyRotatorOptions';
import {
  AsyncWorkerQueue,
  C_STORAGE_DEFAULT,
  Container,
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
import {ProxyUsed} from './ProxyUsed';
import {HttpFactory, IHttp, IHttpGetOptions} from 'commons-http';
import {DEFAULT_USER_AGENT, HEADER_KEY_PROXY_SELECT_PROXY, HEADER_KEY_USER_AGENT} from '../Constants';
import {IProxyServerOptions} from '../server/IProxyServerOptions';
import {ServerRegistry} from '@typexs/server/libs/server/ServerRegistry';
import Timeout = NodeJS.Timeout;

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


const BASEURL = 'httpbin.org/get';

export interface IFetchQuery {
  inc: number;
  selector: IProxySelector;
  updated: Date;
  size: number;
  offset: number;
}

export class ProxyRotator implements IProxyRotator, IQueueProcessor<IpAddr | IProxySelector | ProxyUsed> {

  static NAME = ProxyRotator.name;

  options: IProxyRotatorOptions;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  // connection: ConnectionWrapper;

  queue: AsyncWorkerQueue<any>;

  activeList: IpAddr[] = [];

  http: IHttp;

  logger: ILoggerApi;

  fetchRequests: { [reqId: string]: IFetchQuery } = {};

  proxyServerUri: string = null;

  cleanup: Timeout;

  // offset: number = 0;

  async prepare(opts: IProxyRotatorOptions, serverOpts?: IProxyServerOptions) {
    this.options = _.defaultsDeep(opts, DEFAULT_ROTATOR_OPTIONS);
    this.http = HttpFactory.create();
    this.logger = Log.getLoggerFor(ProxyRotator);
    this.queue = new AsyncWorkerQueue<any>(this, {
      name: 'proxy_rotator_queue',
      concurrent: opts.parallel,
      logger: this.logger
    });

    if (this.options.fillAtStartup) {
      this.doEnqueue({limit: this.options.fetchSize, targetSSL: true});
      this.doEnqueue({limit: this.options.fetchSize, targetSSL: false});
    }

    if (this.options.request.overProxyServer) {
      this.proxyServerUri = (Container.get(ServerRegistry.NAME) as ServerRegistry).get(serverOpts['name']).getUri();
    }

    if (this.options.cleanup) {
      setTimeout(this.removeUnusedProxies.bind(this), this.options.cleanup.interval * 1000);
    }

  }


  removeUnusedProxies() {
    const now = Date.now();
    _.remove(this.activeList, x => now - x.updated_at.getTime() > this.options.cleanup.timeOffset * 1000);
    setTimeout(this.removeUnusedProxies.bind(this), this.options.cleanup.interval * 1000);
  }

  async doEnqueue(workLoad: IProxySelector & { reqId?: string }) {
    // this.fetching = true;
    const reqId = workLoad.reqId;

    if (reqId && this.fetchRequests[reqId]) {
      if (this.fetchRequests[reqId].inc >= 0) {
        // this.semaphore.release();
        return;
      }
      this.fetchRequests[reqId].inc = 0;
    }

    // if (reqId && _.isUndefined(this.fetchRequests[reqId])) {
    //   this.fetchRequests[reqId].inc = 0;
    // }


    let proxyList: any[] = [];
    try {
      proxyList = await this.fetch({...workLoad, reqId, limit: _.get(workLoad, 'limit', this.options.fetchSize)});
      const rotates = this.attachRotateEntriesToIpAddr(proxyList);
      const connection = await this.storageRef.connect();
      await connection.manager.transaction((em) => {
        return em.save(rotates);
      });
      await connection.close();
    } catch (e) {
      Log.error(e);
    } finally {
      Log.debug('proxylist found ' + proxyList.length);
    }

    if (proxyList && _.isArray(proxyList)) {
      // this.fetchRequests[reqId]++;
      for (const c of proxyList) {
        if (reqId) {
          _.set(c, 'reqId', reqId);
          this.fetchRequests[reqId].inc += 1;
        }

        this.queue.push(c).done().finally(() => {
          if (reqId) {
            this.fetchRequests[reqId].inc -= 1;
            if (this.fetchRequests[reqId].inc <= 0) {
              this.fetchRequests[reqId].inc = -1;
              // if (this.activeList.length < this.options.minActive) {
              //   const selector = this.fetchRequests[reqId].selector;
              //   selector.repeat++;
              //   const newReqId = this.cacheQuery(selector);
              //   this.doEnqueue({...selector, reqId: newReqId});
              // }

            }
          }
        });
      }
      if (reqId && (proxyList.length === 0 || this.fetchRequests[reqId].inc === 0)) {
        this.fetchRequests[reqId].inc = -1;
      }
    } else {
      this.fetchRequests[reqId].inc = -1;
    }

    // this.semaphore.release();

  }


  async do(workLoad: IpAddr | IProxySelector | ProxyUsed): Promise<any> {
    // fetch next entry try query
    if (workLoad instanceof IpAddr) {

      const state = workLoad['state'] as IpAddrState;
      const protocol_src = state.protocol_src === ProtocolType.HTTP ? 'http' : 'https';
      const protocol_dest = state.protocol_dest === ProtocolType.HTTP ? 'http' : 'https';
      const proxyUrlStr = protocol_src + '://' + workLoad.ip + ':' + workLoad.port;
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
          workLoad.success = _.get(workLoad, 'rotate.successes', 0);
          workLoad.errors = _.get(workLoad, 'rotate.errors', 0);
          workLoad.used = _.get(workLoad, 'rotate.inc', 0);
          workLoad.updated_at = new Date();
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
      // this.log(used, true);
    }
    return null;
  }


  async doRequest(baseUrlStr: string, proxyUrlStr: string) {

    const headers = {};
    headers[HEADER_KEY_USER_AGENT] = DEFAULT_USER_AGENT;
    const reqOptions: IHttpGetOptions = {
      timeout: this.options.request.timeout,
      proxy: proxyUrlStr,
      retry: 0,
      json: true,
      headers: headers
    };

    if (this.proxyServerUri) {
      reqOptions.proxy = this.proxyServerUri;
      reqOptions.proxyHeaders = {};
      reqOptions.proxyHeaders[HEADER_KEY_PROXY_SELECT_PROXY] = proxyUrlStr;
      reqOptions.headers[HEADER_KEY_PROXY_SELECT_PROXY] = proxyUrlStr;
      this.logger.debug('execute http get to ' + baseUrlStr + ' over ' + reqOptions.proxy +
        ' (target: ' + reqOptions.proxyHeaders['Proxy-Select-Proxy'] + ')');
    } else {
      this.logger.debug('execute http get to ' + baseUrlStr + ' over ' + reqOptions.proxy);
    }


    const response = await this.http.get(baseUrlStr, reqOptions);
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

    // if (this.activeList.length === 0) {
    //   this.doEnqueue({limit: this.options.fetchSize});
    // }
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
    let c = null;
    try {
      c = await this.storageRef.connect(); // storageRef.connect();
      const ipAddr = await c.manager.findOne(IpAddr, {ip: ip.ip, port: ip.port});
      if (ipAddr) {
        let remove = false;
        await c.manager.transaction(async em => {
          ipRotate = await this._doLog(em, ip, ipAddr);
          if (ipRotate.inc > 100) {
            if (ipRotate.successes * 100 / ipRotate.inc < 15) {
              ipAddr.blocked = true;
              if (ipRotate.successes === 0) {
                ipAddr.to_delete = true;
              }
              await em.save(ipAddr);
              remove = true;
            }
          }
        });

        if (addr) {
          if (remove) {
            _.remove(this.activeList, x => x === addr);
          } else {
            if (ip.success) {
              addr.success++;
              addr.duration_avg = ipRotate.duration_average;
            } else {
              addr.errors++;
            }
          }
          // } else {
          //   this.logger.debug('addr not found ' + ipAddr.key);
        }
      }
    } catch (e) {
      this.logger.error(e);
    } finally {
      if (c) {
        await c.close();
      }
    }
    // this.offset = 0;
    return ipRotate;
  }


  private async _doLog(em: any, ip: ProxyUsed, ipAddr: IpAddr) {

    // const log = new IpRotateLog();
    // log.addr_id = ipAddr.id;
    // log.protocol = ip.protocol;
    // log.protocol_dest = ip.protocol_dest;
    // log.duration = Math.ceil(ip.duration);
    // log.success = ip.success;
    // log.start = ip.start;
    // log.stop = ip.stop;
    //
    // // TODO maybe cleanup filename references in paths
    // log.error = ip.error ? ip.error.stack : null;
    // log.statusCode = ip.statusCode;
    // await em.save(log);
    let ipRotate = await em.findOne(IpRotate, {addr_id: ipAddr.id, protocol_src: ip.protocol});
    if (!ipRotate) {
      ipRotate = new IpRotate();
      ipRotate.addr_id = ipAddr.id;
      ipRotate.protocol_src = ip.protocol;
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
    // ipRotate['_log'] = log;

    return ipRotate;
  }


  next(select: IProxySelector = {}): Promise<IpAddr> {
    const proxyFilter = this.parseProxyHeader(select);
    this.logger.debug('next', select, proxyFilter);
    return this.take(proxyFilter);
  }


  // calcOdd(_addr: IpAddr) {
  //   if (_addr.odd % this.options.reuse !== 0 && _addr.used > 0) {
  //     _addr.odd++;
  //     return false;
  //   }
  //   _addr.odd = 0;
  //   return true;
  // }

  useAddr(addr: IpAddr) {
    addr.odd = 1;
    addr.used++;
    addr.updated_at = new Date();
  }

  updateList() {
    this.cleanupList();

    this.activeList.forEach(_addr => {
      if (_addr.odd % this.options.reuse !== 0 && _addr.used > 0) {
        _addr.odd++;
      } else {
        _addr.odd = 0;
      }
    });

    this.orderActiveList();
  }

  cacheQuery(selector: IProxySelector = {}) {
    if (!selector.repeat) {
      selector.repeat = 0;
    }
    const reqId = CryptUtils.shorthash(JSON.stringify(selector));
    if (!this.fetchRequests[reqId]) {
      this.fetchRequests[reqId] = {
        selector: selector,
        updated: new Date(),
        inc: -1,
        size: 0,
        offset: 0
      };
    } else {
      this.fetchRequests[reqId].updated = new Date();
    }
    return reqId;
  }


  async take(selector: IProxySelector = {}): Promise<IpAddr> {
    this.printList('before iteration');
    const reqId = this.cacheQuery(selector);

    let addr: IpAddr = null;
    const now = Date.now();
    const addrIndex = this.activeList.findIndex((value, index) => {
      if (value.odd !== 0) {
        return false;
      }
      // wait till reuse 2s
      if (now - value.updated_at.getTime() < 2000) {
        return false;
      }

      if (selector) {
        let match = true;
        const state = (<IpAddrState>value['state']);
        if (selector['speed-limit']) {
          match = match && state.duration <= selector['speed-limit'];
        }
        if (selector.level) {
          match = match && state.level <= selector.level;
        }
        if (selector.targetSSL) {
          match = match && state.protocol_dest === ProtocolType.HTTPS;
        } else {
          match = match && state.protocol_dest === ProtocolType.HTTP;
        }
        return match;
      } else {
        return true;
      }
    });

    if (addrIndex >= 0) {
      addr = this.activeList[addrIndex];
    }

    this.printList('after iteration');

    this.logger.debug('take address ' + (addr ? addr.key + ' (' +
      addr.used + ',' + addr.success + ',' + addr.errors + ',' +
      addr.duration_avg + ')' : '') + ' amount=' + this.activeList.length
    );

    this.updateList();
    if (addr) {
      this.useAddr(addr);
      // this.orderActiveList();
      return Promise.resolve(addr);
    } else {

      selector.repeat++;
      if (selector.repeat >= this.options.reuse) {
        selector.repeat = 0;
      }
      try {
        await this.doEnqueue({...selector, reqId});
      } catch (e) {
        Log.error(e);
      }
      return new Promise((resolve, reject) => {
        const listener = (ipaddr: IpAddr) => {
          // this.logger.debug('got success request for proxy url ' + ipaddr.key);
          clearTimeout(timer);
          setTimeout(() => {
            resolve(this.take(selector));
          });
          // this.useAddr(ipaddr);
          // resolve(ipaddr);
        };
        const timer = setTimeout(() => {
          reject(new Error('cant find proxy address!'));
          // TODO kill listener!
          this.queue.removeListener('success_request_' + reqId, listener);
        }, 5000);
        this.queue.once('success_request_' + reqId, listener);
      });
    }
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
        } else if (_k === 'ssl' || _k === 'targetSSL') {
          _headers['targetSSL'] = headers[_k];
        }
      });
    }
    return _headers;
  }


  // async connect() {
  //   if (!this.connection) {
  //     this.connection = await this.storageRef.connect();
  //   }
  //   return this.connection;
  // }


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

  async dbCleanup() {
    const c = await this.storageRef.connect();
    let q = c.manager.createQueryBuilder(IpAddr, 'ip');
    q = q.innerJoinAndMapOne('ip.state', IpAddrState, 'state', 'state.validation_id = ip.validation_id and state.addr_id = ip.id');
    q = q.leftJoinAndMapOne('ip.rotate', IpRotate, 'rotate', 'rotate.addr_id = ip.id and rotate.protocol_src = state.protocol_src');


  }

  async fetch(select?: IProxySelector & { reqId?: string }) {
    let fetchQuery: IFetchQuery = null;
    let offset = 0;
    if (select.reqId) {
      fetchQuery = this.fetchRequests[select.reqId];
      offset = fetchQuery.offset + fetchQuery.size;
    }
    const c = await this.storageRef.connect();
    let q = c.manager.createQueryBuilder(IpAddr, 'ip');
    q = q.innerJoinAndMapOne('ip.state', IpAddrState, 'state', 'state.validation_id = ip.validation_id and state.addr_id = ip.id');
    q = q.leftJoinAndMapOne('ip.rotate', IpRotate, 'rotate', 'rotate.addr_id = ip.id and rotate.protocol_src = state.protocol_src');


    q = q.andWhere('state.enabled = :enable', {enable: true});

    q = q.andWhere('state.level > :level', {level: 0});
    q = q.andWhere('ip.to_delete = :toDelete', {toDelete: false});
    q = q.andWhere('ip.blocked = :blocked', {blocked: false});

    // filter faling!
    q = q.andWhere('((rotate.inc >= 100 AND (rotate.successes * 100 / rotate.inc) > 33) OR ' +
      '(rotate.inc > 10 AND rotate.inc < 100 AND (rotate.successes * 100 / rotate.inc) > 15) OR ' +
      'rotate.inc is null OR ' +
      'rotate.inc <= 10)');


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
      if (select.targetSSL) {
        q = q.andWhere('state.protocol_dest = :protocol', {protocol: ProtocolType.HTTPS});
      } else {
        q = q.andWhere('state.protocol_dest = :protocol', {protocol: ProtocolType.HTTP});
      }
    }


    const orderBy = [];
    const rotation = select.repeat % 4;
    switch (rotation) {
      case 0:
        orderBy.push('rotate.updated_at', 'ASC');
        break;
      case 1:
        orderBy.push('rotate.used', 'ASC');
        break;
      case 2:
        orderBy.push('rotate.duration_average', 'ASC');
        break;
      case 3:
        orderBy.push('rotate.inc', 'ASC');
        break;
    }

    if (this.storageRef.dbType === 'postgres') {
      orderBy.push('NULLS FIRST');
    }

    if (orderBy.length > 0) {
      q.orderBy.apply(q, orderBy);
    }

    const limit = _.get(select, 'limit', 1);
    // let count = limit + 1;
    // try {
    //   count = await q.clone().getCount();
    // } catch (e) {
    //   Log.error(e);
    // }
    //
    // if ((count - limit - 1) > 0) {
    //   const range = _.random(0, count - limit - 1, false);
    //   q.offset(range);
    // }

    q.offset(offset);
    q = q.limit(limit);

    const res = await q.getMany();
    if (fetchQuery) {
      if (res.length > 0) {
        fetchQuery.size = res.length;
        fetchQuery.offset = offset;
      } else {
        fetchQuery.offset = 0;
        fetchQuery.size = 0;
      }
    }
    // if (res.length === 0) {
    //   this.offset = 0;
    // } else {
    //   this.offset += limit;
    // }
    this.logger.debug('fetch found ' + res.length);
    await c.close();
    return res;
  }


  log(ip: ProxyUsed, test: boolean = false): Promise<IpRotate> {
    return this.doLog(ip, test);
  }


  async shutdown() {
    this.queue.removeAllListeners();
    clearTimeout(this.cleanup);
    // if (this.connection) {
    //   await this.connection.close();
    // }
  }


  orderActiveList() {
    this.activeList = _.orderBy(this.activeList,
      ['odd', 'update_at', 'success', 'duration_avg'],
      ['asc', 'asc', 'desc', 'asc']);
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
    const removed = _.remove(this.activeList, (r) =>
      (r.used > 9 && r.success / r.used <= .15) &&
      (r.used > 99 && r.success / r.used <= .30)
    );
    if (removed.length > 0) {
      this.logger.debug('cleanup active list ' + this.activeList.length + '; removed ' + removed.length);
    }
  }

}
