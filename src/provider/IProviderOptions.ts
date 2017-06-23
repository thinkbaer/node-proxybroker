

import {StringOrFunction} from "../types";

export interface IProviderOptions {

    // enable : boolean

    providers? : StringOrFunction[]

    offset? : number

    /**
     * Amount of parallel allowed worker jobs
     */
    parallel?:number
}