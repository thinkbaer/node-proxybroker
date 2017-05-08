

import {IStorageOptions} from "../storage/IStorageOptions";
import {IProviderOptions} from "../provider/IProviderOptions";
import {IUrlBase} from "../lib/IUrlBase";


interface IServerOptions extends IUrlBase {
    enable: boolean
    path: string
}


export interface ProxyOptions extends IServerOptions {}


export interface UIOptions  extends IServerOptions {}


export interface IConfigOptions {

    /**
     * Path to the work directory or null
     * Necessary for standalone storage backends like sqlite or derby
     */
    workdir? : string

    /**
     * Path to the user home directory
     */
    userdir? : string

    /**
     * Path of application
     */
    appdir? : string

    /**
     * Path to the config file
     */
    configfile? : string

    /**
     * Options for the frontend modul
     * TODO needs work
     */
    readonly ui?: UIOptions

    /**
     *  Options for the proxy server
     */
    readonly proxy?: ProxyOptions

    /**
     * Storage options
     */
    storage?: IStorageOptions

    /**
     * Provider options
     */
    provider?: IProviderOptions

}


