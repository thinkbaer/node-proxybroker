import {DEFAULT_ROTATOR_OPTIONS, IProxyRotatorOptions} from './IProxyRotatorOptions';
import * as _ from 'lodash';
import {subscribe} from 'commons-eventbus/decorator/subscribe';
import {Log, StorageRef} from '@typexs/base';
import {IpRotate} from '../../entities/IpRotate';
import {IpAddr} from '../../entities/IpAddr';
import {IpRotateLog} from '../../entities/IpRotateLog';
import {IpAddrState} from '../../entities/IpAddrState';
import {IpLoc} from '../../entities/IpLoc';
import {ProtocolType} from '../specific/ProtocolType';
import {ProxyUsedEvent} from '../../event/ProxyUsedEvent';

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


export class ProxyRotator {

  static NAME = ProxyRotator.name;

  options: IProxyRotatorOptions;

  storageRef: StorageRef;


  initialize(opts: IProxyRotatorOptions, storage: StorageRef) {
    this.options = _.defaultsDeep(opts, DEFAULT_ROTATOR_OPTIONS);
    this.storageRef = storage;
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


  @subscribe(ProxyUsedEvent)
  async log(event: ProxyUsedEvent): Promise<IpRotate> {
    Log.debug('ProxyRotator->log ', event);

    let ipRotate: IpRotate = null;
    // add to log
    const c = await this.storageRef.connect();
    const ipAddr = await c.manager.findOne(IpAddr, {ip: event.hostname, port: event.port});
    if (ipAddr) {

      const log = new IpRotateLog();
      log.addr_id = ipAddr.id;
      log.protocol = event.protocol;
      log.protocol_dest = event.protocol_dest;

      log.duration = event.duration;
      log.success = event.success;
      log.start = event.start;
      log.stop = event.stop;
      // TODO maybe cleanup filename references in paths
      log.error = event.error ? event.error.stack : null;
      log.statusCode = event.statusCode;
      await c.manager.save(log);

      ipRotate = await c.manager.findOne(IpRotate, {addr_id: ipAddr.id, protocol_src: event.protocol});
      if (!ipRotate) {
        ipRotate = new IpRotate();
        ipRotate.addr_id = ipAddr.id;
        ipRotate.protocol_src = event.protocol;

      }

      if (event.success) {
        ipRotate.duration += event.duration;
        ipRotate.successes += 1;
        if (ipRotate.duration > 0 && ipRotate.successes > 0) {
          ipRotate.duration_average = ipRotate.duration / ipRotate.successes;
        }
      } else {
        ipRotate.errors += 1;
      }
      await c.manager.save(ipRotate);

      ipRotate['_log'] = log;

    }
    Log.debug('ProxyRotator->log: done');
    return ipRotate;

  }

  async next(select?: any): Promise<IpAddr> {
    Log.debug('ProxyRotator->next ', select);
    select = this.parseProxyHeader(select);
    const c = await this.storageRef.connect();
    let q = c.manager.createQueryBuilder(IpAddr, 'ip');

    q = q.innerJoinAndMapOne('ip.state', IpAddrState, 'state', 'state.validation_id = ip.validation_id and state.addr_id = ip.id');
    q = q.leftJoinAndMapOne('ip.rotate', IpRotate, 'rotate', 'rotate.addr_id = ip.id and rotate.protocol_src = state.protocol_src');
    q = q.orderBy('rotate.used', 'ASC');
    q = q.addOrderBy('state.duration', 'ASC');
    q = q.limit(1);

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
      if (iprotate.inc % 10 == 0) {
        iprotate.used = 0;
      } else {
        iprotate.used++;
      }

      ipaddr['rotate'] = await c.save(iprotate);
    }
    await c.close();
    return ipaddr;

  }
}
