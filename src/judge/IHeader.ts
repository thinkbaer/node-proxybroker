import {IKeyValuePair} from "../libs/generic/IKeyValuePair";
export interface IHeader extends IKeyValuePair<string> {
    hasLocalIp: boolean
    hasProxyIp: boolean
    isVia: boolean
    isForward: boolean
    ip: string
    host: string
}
