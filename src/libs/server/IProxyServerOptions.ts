import {IUrlBase} from '@typexs/base';
import {IpAddr} from '../../entities/IpAddr';
import {IServerInstanceOptions, IServerOptions} from '@typexs/server';
import {IProxySelector} from '../proxy/IProxySelector';
import {ProxyUsed} from '../proxy/ProxyUsed';

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

  /**
   * Free name for the proxyserver (used for further instance access)
   */
  name?: string;

  enable?: boolean;

  level: number;

  toProxy: boolean;

  target?: ((select?: IProxySelector) => Promise<IUrlBase | IpAddr>) | string;

  proxyLog?: (ip?: ProxyUsed) => Promise<IpAddr>;

  repeatLimit?: number;

  broker?: {

    enable?: boolean,

    timeouts?: {

      forward?: number,

      incoming?: number

    }
  }
}


export const DEFAULT_PROXY_SERVER_OPTIONS: IProxyServerOptions = {

  ...DEFAULT_SERVER_OPTIONS,

  type: 'proxybroker',

  level: 3,

  toProxy: false,

  enable: true,

  repeatLimit: 3,

  broker: {

    enable: false,

    timeouts: {

      forward: 1000,

      incoming: 30000
    }
  }
};
