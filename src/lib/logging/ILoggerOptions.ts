import {LoggerOptions, TransportOptions} from "winston";
export const K_LOGGING = "logging"

// export type TransportType = "console" | "file" | "dailyrotatefile" | "http" | "memory" | "webhook" | "winstonmodule"
//"console" | "file" | "dailyrotatefile" | "http" | "memory" | "webhook" | "winstonmodule"




export interface ILoggerOptions  {

    enable: boolean

    level?: string

    events?: boolean

    transports?: [{
        [k: string]: TransportOptions
    }]
}