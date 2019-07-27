import {IKeyValuePair} from "@typexs/base";

export interface IHeader extends IKeyValuePair<string> {
    hasLocalIp: boolean
    hasProxyIp: boolean
    isVia: boolean
    isForward: boolean
    ip: string
    host: string
}
