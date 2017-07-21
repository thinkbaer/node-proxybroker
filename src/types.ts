
import {ILoggerOptions} from "./lib/logging/ILoggerOptions";
export type ObjectType<T> = { new (): T }|Function;
export type StringOrFunction = string | Function

export const K_WORKDIR:string = 'workdir';


export const DEFAULT_CONFIG_OPTIONS = {
};