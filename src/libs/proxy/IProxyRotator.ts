import {Token} from 'typedi';
import {IpAddr} from '../../entities/IpAddr';
import {IProxySelector} from './IProxySelector';
import {ProxyUsed} from './ProxyUsed';
import {IpRotate} from '../../entities/IpRotate';


export const PROXY_ROTATOR_SERVICE = new Token<IProxyRotator>('ProxyRotatorService');


export interface IProxyRotator {


  next(select?: IProxySelector): Promise<IpAddr>;

  log(ip: ProxyUsed): Promise<IpRotate>;

}
