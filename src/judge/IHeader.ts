import {IKeyValuePair} from "../lib/IKeyValuePair";
export interface IHeader extends IKeyValuePair<string> {
    hasLocalIp: boolean
    hasProxyIp: boolean
    isVia: boolean
    isForward: boolean
    ip: string
    host: string
}
