

import {IProviderWorkerAPI} from "./IProviderWorkerAPI";
import {IProviderVariant} from "./IProviderVariant";



export interface IProvider {

    readonly name:string;

    readonly url:string;

    readonly variants : Array<IProviderVariant>;

    prepare?():Promise<void>;

    do(api: IProviderWorkerAPI): Promise<void>;
}