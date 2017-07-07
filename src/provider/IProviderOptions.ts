

import {StringOrFunction} from "../types";

export interface IProviderOptions {

    // enable : boolean

    providers? : StringOrFunction[]

    schedule?: {
        enable?: boolean
        recheck?: number
        pattern?:string
    }


    /**
     * Amount of parallel allowed worker jobs
     */
    parallel?:number
}