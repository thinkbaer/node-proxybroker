

import {IProviderVariant} from "./IProviderVariant";

export interface IProviderDef extends IProviderVariant {

    clazz: Function

    name: string

    url: string


}