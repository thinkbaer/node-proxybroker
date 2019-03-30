

import {IProviderVariant} from "./IProviderVariant";
import {Job} from "../entities/Job";

export interface IProviderDef extends IProviderVariant {

    clazz: Function

    job?: Job



}