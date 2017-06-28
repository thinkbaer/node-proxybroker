

import {IProviderWorkerAPI} from "./IProviderWorkerAPI";
import {IProviderVariant} from "./IProviderVariant";
import {IProxyData} from "../proxy/IProxyData";



export interface IProvider {

    readonly name:string;

    readonly url:string;

    readonly variants : IProviderVariant[];

    prepare?():Promise<void>;

    get(): Promise<IProxyData[]>;

    do(api: IProviderWorkerAPI): Promise<void>;
}