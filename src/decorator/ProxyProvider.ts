

import {Config} from "../config/Config";
import {ClassMetadataArgs} from "../config/ClassMetadataArgs";
/**
 * This decorator is used to mark classes that will be an proxy provider definition.
 */

export function ProxyProvider(name?:string){
    console.log(name)
    return function (target: Function) {
        const args: ClassMetadataArgs = {
            target: target,
            name: name
        };
        Config.get().metadata.classes.push(args)
    };
}