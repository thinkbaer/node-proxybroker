
export interface IServerOptions {
    stall?: number
    cert_file?: string
    cert?: string | Buffer
    key_file?: string
    key?: string | Buffer,
    ca_file?: string
    ca?: string | Buffer
    ca_key_file?: string
    ca_key?: string | Buffer,
    strictSSL?: boolean,
    timeout?: number
    // dual_protocol?:boolean

    url: string
    _debug?: boolean
}