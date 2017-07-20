import {DEFAULT_SERVER_OPTIONS, IServerOptions} from "./IServerOptions";
import {IpAddr} from "../model/IpAddr";
import {IUrlBase} from "../lib/IUrlBase";

export interface IProxyServerOptions extends IServerOptions {
    level: number
    toProxy: boolean
    target?: ((select?: any) => Promise<IUrlBase | IpAddr>) | string
    onSuccess?: ((select?: any) => Promise<IUrlBase | IpAddr>)
    onError?: ((select?: any) => Promise<IUrlBase | IpAddr>)
}


export const DEFAULT_PROXY_SERVER_OPTIONS: IProxyServerOptions = {
    ...DEFAULT_SERVER_OPTIONS,
    level: 3,
    toProxy: false

};
