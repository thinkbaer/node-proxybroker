

import {StorageOptions} from "../storage/StorageOptions";

interface ServerOptions {
    enable: boolean
    host: string
    port: number
    path: string
}

export interface ProxyOptions extends ServerOptions {}

export interface UIOptions  extends ServerOptions {}


export interface ConfigOptions {

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
     * Storage Options
     */
    storage?: StorageOptions
}


