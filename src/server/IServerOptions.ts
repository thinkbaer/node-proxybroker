
export interface IServerOptions {
    url?: string

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

    _debug?: boolean
}


export const DEFAULT_SERVER_OPTIONS: IServerOptions = {
    url: 'http://localhost:3128',
    stall: 0,
    timeout: 60000,
    //dual_protocol:false,
    _debug: false
};
