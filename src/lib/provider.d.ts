/**
 * Created by cezaryrk on 15.10.16.
 */

// import * as Promise from "bluebird";

export interface Provider {

    init(options : any) : any;

    hasNext():any;

    next(): any;
}


export class ProviderManager {

}