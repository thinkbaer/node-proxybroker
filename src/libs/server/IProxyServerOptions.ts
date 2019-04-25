import {IUrlBase} from "@typexs/base";
import {IpAddr} from "../../entities/IpAddr";
import {IServerInstanceOptions, IServerOptions} from "@typexs/server";

export const K_PROXYSERVER = 'proxyserver';

export const DEFAULT_SERVER_OPTIONS: IServerOptions = {

  protocol: 'http',

  ip: '127.0.0.1',

  port: 3128,

  fn: 'root',

  stall: 0,

  timeout: 60000,

  _debug: false
};

export interface IProxyServerOptions extends IServerOptions, IServerInstanceOptions {

  enable?: boolean

  level: number

  toProxy: boolean

  target?: ((select?: any) => Promise<IUrlBase | IpAddr>) | string

  repeatLimit?: number


}


export const DEFAULT_PROXY_SERVER_OPTIONS: IProxyServerOptions = {

  ...DEFAULT_SERVER_OPTIONS,

  type: 'proxybroker',

  level: 3,

  toProxy: false,

  enable: true,

  repeatLimit: 0

};
