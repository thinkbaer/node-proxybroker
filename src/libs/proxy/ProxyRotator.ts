import * as _ from 'lodash';
import {DEFAULT_ROTATOR_OPTIONS, IProxyRotatorOptions} from './IProxyRotatorOptions';
import {C_STORAGE_DEFAULT, ConnectionWrapper, Inject, Log, StorageRef} from '@typexs/base';
import {IpRotate} from '../../entities/IpRotate';
import {IpAddr} from '../../entities/IpAddr';
import {IpAddrState} from '../../entities/IpAddrState';
import {IpLoc} from '../../entities/IpLoc';
import {ProtocolType} from '../specific/ProtocolType';
import {IProxyRotator} from './IProxyRotator';
import {IProxySelector} from './IProxySelector';
import {IpRotateLog} from '../../entities/IpRotateLog';
import {ProxyUsed} from './ProxyUsed';

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


export class ProxyRotator implements IProxyRotator {

  static NAME = ProxyRotator.name;

  options: IProxyRotatorOptions;

  @Inject(C_STORAGE_DEFAULT)
  storageRef: StorageRef;

  connection: ConnectionWrapper;

  async prepare(opts: IProxyRotatorOptions) {
    this.options = _.defaultsDeep(opts, DEFAULT_ROTATOR_OPTIONS);

  }


  parseProxyHeader(headers: any) {
    const _headers: any = {};
    if (headers) {
      const keys = Object.keys(headers);
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


  async next(select?: IProxySelector): Promise<IpAddr> {
    Log.debug('ProxyRotator->next ', select);
    select = this.parseProxyHeader(select);
    const c = await this.connect();
    let q = c.manager.createQueryBuilder(IpAddr, 'ip');

    q = q.innerJoinAndMapOne('ip.state', IpAddrState, 'state', 'state.validation_id = ip.validation_id and state.addr_id = ip.id');
    q = q.leftJoinAndMapOne('ip.rotate', IpRotate, 'rotate', 'rotate.addr_id = ip.id and rotate.protocol_src = state.protocol_src');
    if (this.storageRef.dbType === 'postgres') {
      q = q.addOrderBy('rotate.used', 'ASC', 'NULLS FIRST');
      // q = q.addOrderBy('ip.count_success', 'DESC', 'NULLS LAST');
      q = q.addOrderBy('state.duration', 'ASC', 'NULLS FIRST');
    } else {
      q = q.addOrderBy('rotate.used', 'ASC');
      q = q.addOrderBy('state.duration', 'ASC');
    }
    q = q.limit(_.get(select, 'limit', 1));

    q = q.where('state.enabled = :enable', {enable: true});
    q = q.andWhere('state.level > :level', {level: 0});
    // q = q.andWhere('(rotate.errors < rotate.successes) or (rotate.errors is null and rotate.successes is null)');

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

    let ipaddr: IpAddr = null;
    const list = await q.getMany();
    if (list.length > 0) {
      ipaddr = list.shift();
      let iprotate: IpRotate = null;
      if (ipaddr['rotate']) {
        iprotate = ipaddr['rotate'];
      } else {
        iprotate = new IpRotate();
        iprotate.addr_id = ipaddr.id;
        iprotate.protocol_src = ipaddr['state'].protocol_src;
      }

      iprotate.inc++;
      if (iprotate.inc % 10 === 0) {
        iprotate.used = 0;
      } else {
        iprotate.used++;
      }

      ipaddr['rotate'] = await c.save(iprotate);
    }
    // await c.close();
    return ipaddr;

  }

  async log(ip: ProxyUsed): Promise<IpRotate> {
    Log.debug('ProxyRotator->log ', ip);
    let ipRotate: IpRotate = null;
    // add to log
    try {
      const c = await this.connect(); // storageRef.connect();

      const ipAddr = await c.manager.findOne(IpAddr, {ip: ip.ip, port: ip.port});
      if (ipAddr) {
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
        await c.manager.save(log);
        ipRotate = await c.manager.findOne(IpRotate, {addr_id: ipAddr.id, protocol_src: ip.protocol});
        if (!ipRotate) {
          ipRotate = new IpRotate();
          ipRotate.addr_id = ipAddr.id;
          ipRotate.protocol_src = ip.protocol;
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
        await c.manager.save(ipRotate);
        ipRotate['_log'] = log;
      }
    } catch (e) {
      Log.error(e);
    }
    Log.debug('ProxyRotator->log: done');
    return ipRotate;

  }

}
