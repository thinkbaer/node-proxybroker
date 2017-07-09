

import {IProviderVariant} from "./IProviderVariant";
import {Job} from "../model/Job";

export interface IProviderDef extends IProviderVariant {

    clazz: Function

    job?: Job



}