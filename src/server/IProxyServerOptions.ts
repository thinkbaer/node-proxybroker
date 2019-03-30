import {DEFAULT_SERVER_OPTIONS, IServerOptions} from "./IServerOptions";
import {IpAddr} from "../entities/IpAddr";
import {IUrlBase} from "../libs/generic/IUrlBase";
import {SocketHandle} from "./SocketHandle";

export const K_PROXYSERVER = 'proxyserver'

export interface IProxyServerOptions extends IServerOptions {

    enable?: boolean

    level: number

    toProxy: boolean

    target?: ((select?: any) => Promise<IUrlBase | IpAddr>) | string

    repeatLimit?:number


}


export const DEFAULT_PROXY_SERVER_OPTIONS: IProxyServerOptions = {

    ...DEFAULT_SERVER_OPTIONS,

    level: 3,

    toProxy: false,

    enable:true,

    repeatLimit:0

};
