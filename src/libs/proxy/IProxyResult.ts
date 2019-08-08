import {IProxyData} from './IProxyData';

export interface IProxyResult extends IProxyData {

  protocol: string;

  level: number;

  duration: number;

  enabled: boolean;
}
