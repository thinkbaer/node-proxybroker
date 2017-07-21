import {DEFAULT_SERVER_OPTIONS, IServerOptions} from "./IServerOptions";
import {IpAddr} from "../model/IpAddr";
import {IUrlBase} from "../lib/IUrlBase";
import {SocketHandle} from "./SocketHandle";

export const K_PROXYSERVER = 'proxyserver'

export interface IProxyServerOptions extends IServerOptions {
    enable?: boolean
    level: number
    toProxy: boolean
    target?: ((select?: any) => Promise<IUrlBase | IpAddr>) | string
    // status?: ((url:IUrlBase, handle:SocketHandle) => Promise<void>)

}


export const DEFAULT_PROXY_SERVER_OPTIONS: IProxyServerOptions = {
    ...DEFAULT_SERVER_OPTIONS,
    level: 3,
    toProxy: false,
    enable:true

};
