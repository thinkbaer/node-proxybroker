

import {IProvider} from "./IProvider";
import {IProviderWorkerAPI} from "./IProviderWorkerAPI";
import {IProviderVariant} from "./IProviderVariant";


export abstract class AbstractProvider implements IProvider {

    abstract readonly name:string;

    abstract readonly url:string;

    abstract readonly variants : Array<IProviderVariant>;

    private _variant : IProviderVariant;

    constructor(variant : IProviderVariant) {
        this._variant = variant
    }

    get variant(): IProviderVariant {
        return this._variant
    }

    abstract do(api: IProviderWorkerAPI): Promise<void>;

}