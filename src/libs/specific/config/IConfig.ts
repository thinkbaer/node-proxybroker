

import {IStorageOptions} from "../../generic/storage/IStorageOptions";
import {IProviderOptions} from "../../../provider/IProviderOptions";
import {IUrlBase} from "../../generic/IUrlBase";
import {ILoggerOptions} from "../../generic/logging/ILoggerOptions";


export interface IServiceOptions extends IUrlBase {
    enable: boolean
    path: string
}


export interface IProxyOptions extends IServiceOptions {}


export interface IUIOptions  extends IServiceOptions {}


export interface IConfig {

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
    readonly ui?: IUIOptions

    /**
     *  Options for the proxy server
     */
    readonly proxy?: IProxyOptions

    /**
     * Storage options
     */
    storage?: IStorageOptions

    /**
     * Provider options
     */
    provider?: IProviderOptions


    /**
     * Logging configuration
     */
    logging?: ILoggerOptions

}


