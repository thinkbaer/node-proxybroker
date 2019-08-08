import * as _ from 'lodash';
import {IpAddr} from '../entities/IpAddr';
import {IpAddrState} from '../entities/IpAddrState';
import {IProxyData} from './proxy/IProxyData';
import {IProxyResult} from './proxy/IProxyResult';
import {StorageRef} from '@typexs/base';
import {ProtocolType} from './specific/ProtocolType';

export class StorageHelper {

  static async fetchValidated(storageRef: StorageRef, list: IProxyData[]) {
    const connection = await storageRef.connect();
    const out: IProxyResult[] = [];
    const chunks = _.chunk(list, 100);

    for (const chunk of chunks) {
      let q = connection.manager.createQueryBuilder(IpAddr, 'ip');
      q = q.innerJoinAndMapOne('ip.state', IpAddrState, 'state', 'state.validation_id = ip.validation_id and state.addr_id = ip.id');
      q = q.where('state.enabled = :enable', {enable: true});
      q = q.andWhere('state.level > :level', {level: 0});
      chunk.forEach(x => {
        q.orWhere('ip.ip = :ip AND ip.port = :port', x);
      });
      const results = await q.getMany();
      results.forEach(x => {
        const state = <IpAddrState>(x['state']);
        out.push({
          protocol: state.protocol_src === ProtocolType.HTTP ? 'http' : 'https',
          ip: x.ip,
          port: x.port,
          enabled: state.enabled,
          level: state.level,
          duration: state.duration

        });
      });
    }

    await connection.close();
    return out;
  }
}
