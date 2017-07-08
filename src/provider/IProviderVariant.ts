

import {IProviderVariantId} from "./IProviderVariantId";

export interface IProviderVariant extends IProviderVariantId {

    url?: string

    [key:string]:any;

}