

import {IProviderWorkerAPI} from "./IProviderWorkerAPI";
import {IProviderVariant} from "./IProviderVariant";
import {IProxyDef} from "./IProxyDef";



export interface IProvider {

    readonly name:string;

    readonly url:string;

    readonly variants : IProviderVariant[];

    prepare?():Promise<void>;

    get(): Promise<IProxyDef[]>;

    do(api: IProviderWorkerAPI): Promise<void>;
}