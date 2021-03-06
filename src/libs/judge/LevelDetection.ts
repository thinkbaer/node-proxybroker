
import * as _ from 'lodash';


import {IHeader} from './IHeader';
import {DomainUtils} from '@typexs/base';
import {Utils} from 'commons-config';

const HTTP_FORWARD_HEADER = [
  'forwarded-for',
  'http-x-forwarded-for',
  'http-client-ip',
  'x-client-ip',
  'x-http-forwarded-for',
  'forwarded',
  'http-forwarded',
  'accproxyws',
  'cdn-src-ip',
  'client-ip',
  'cuda_cliip',
  'forwarded',
  'forwarded-for',
  'remote-host',
  'x-client-ip',
  'x-coming-from',
  'x-forwarded',
  'x-forwarded-for',
  'x-forwarded-for-ip',
  'x-forwarded-host',
  'x-forwarded-server',
  'x-host',
  'x-network-info',
  'x-nokia-remotesocket',
  'x-proxyuser-ip',
  'x-qihoo-ip',
  'x-real-ip',
  'xcnool_forwarded_for',
  'xcnool_remote_addr'];


const HTTP_VIA_HEADER = [
  'http-via',
  'proxy-connection',
  'mt-proxy-id',
  'proxy-agent',
  'surrogate-capability',
  'via',
  'x-authenticated-user',
  'x-bluecoat-via',
  'x-cache',
  'x-cid-hash',
  'x-content-opt',
  'x-d-forwarder',
  'x-fikker',
  'x-forwarded-proto',
  'x-imforwards',
  'x-loop-control',
  'x-mato-param',
  'x-nai-id',
  'x-nokia-gateway-id',
  'x-nokia-localsocket',
  'x-proxy-id',
  'x-roaming',
  'x-turbopage',
  'x-varnish',
  'x-via',
  'x-wap-profile',
  'x-wrproxy-id',
  'x-xff-0',
  'xroxy-connection'];

const ignore_headers = ['host'];


export class LevelDetection {

  constructor(proxy_ip: string, ip: string) {
    this._level = LevelDetection.DEFAULT_LEVEL;
    this.proxy_ip = proxy_ip;
    this.local_ip = ip;
  }

  get level() {
    return this._level;
  }

  get headers(): IHeader[] {
    return this.recv_headers;
  }

  static DEFAULT_LEVEL = -1;


  local_ip: string = null;
  proxy_ip: string = null;

  local_regex: RegExp = null;
  proxy_regex: RegExp = null;

  local_regex_str: string = null;
  proxy_regex_str: string = null;

  stats: {
    hasLocalIp: number,
    hasProxyIp: number,
    isVia: number,
    isForward: number
  } = {
    hasLocalIp: 0,
    hasProxyIp: 0,
    isVia: 0,
    isForward: 0

  };

  private recv_headers: IHeader[] = [];

  private _level: number = null;

  private static async createAddrRegex(ip: string): Promise<string> {

    const l: string[] = [];
    l.push('(' + Utils.escapeRegExp(ip) + '(\\s|$|:))');
    const result = await DomainUtils.domainLookup(ip);
    if (result && result.addr !== ip) {
      l.push('(' + Utils.escapeRegExp(result.addr) + '(\\s|$|:))');
    }
    if (result && result.addr) {
      const hosts = await DomainUtils.reverse(result.addr);
      hosts.forEach(_x => {
        l.push('(' + Utils.escapeRegExp(_x) + '(\\s|$|:))');
      });
    }
    return Promise.resolve(l.join('|'));
  }


  addRecvHeader(headers: any) {
    const keys = Object.keys(headers).filter((x) => {
      return ignore_headers.indexOf(x) === -1;
    });

    for (const k of keys) {
      this.recv_headers.push({
        key: k,
        value: headers[k],
        hasLocalIp: false,
        hasProxyIp: false,
        isForward: false,
        isVia: false,
        ip: null,
        host: null
      });
    }
  }


  async prepare(): Promise<void> {
    this.local_regex_str = await LevelDetection.createAddrRegex(this.local_ip);
    this.proxy_regex_str = await LevelDetection.createAddrRegex(this.proxy_ip);

    this.local_regex = new RegExp(this.local_regex_str, 'gi');
    this.proxy_regex = new RegExp(this.proxy_regex_str, 'gi');
  }


  async detect(): Promise<void> {
    const self = this;
    for (const header of this.recv_headers) {

      const key = header.key;
      const value = header.value;

      if (this.local_regex.test(value)) {
        // this.is_ip_present.push(k)
        header.hasLocalIp = true;
      }

      if (this.proxy_regex.test(value)) {
        header.hasProxyIp = true;
      }

      if (HTTP_FORWARD_HEADER.indexOf(key.toLocaleLowerCase()) > -1) {
        header.isForward = true;
      }

      if (HTTP_VIA_HEADER.indexOf(key.toLocaleLowerCase()) > -1) {
        header.isVia = true;
      }

      _.keys(header).forEach(_k => {
        if (header[_k] === true) {
          self.stats[_k]++;
        }
      });
    }

    if (!this.hasLocalIP() && !this.hasProxyIP() && !this.hasViaHeader() && !this.hasForwardHeader()) {
      // Elite
      this._level = 1;
    } else if (!this.hasLocalIP()) {
      // Anonym
      this._level = 2;
    } else {
      // Transparent
      this._level = 3;
    }

    return Promise.resolve();
  }

  hasForwardHeader(): boolean {
    return this.stats.isForward > 0;
  }

  hasViaHeader(): boolean {
    return this.stats.isVia > 0;
  }

  hasProxyIP(): boolean {
    return this.stats.hasProxyIp > 0;
  }

  hasLocalIP(): boolean {
    return this.stats.hasLocalIp > 0;
  }

  findAll(d: any): any[] {
    return _.filter(this.recv_headers, d);
  }

}
