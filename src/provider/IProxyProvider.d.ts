

import {IProviderWorkerAPI} from "./IProviderWorkerAPI";

export interface IProxyProvider {

    readonly url?:string

    readonly name?:string

    readonly type?:string

    do(api: IProviderWorkerAPI, done: Function): void;
}