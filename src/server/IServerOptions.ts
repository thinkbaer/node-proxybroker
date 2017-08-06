export interface IServerOptions {

    // url?: string

    protocol?: string

    ip?: string,

    port?: number,

    fn?: string,

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

    _debug?: boolean
}


export const DEFAULT_SERVER_OPTIONS: IServerOptions = {

    protocol: 'http',

    ip: '127.0.0.1',

    port: 3128,

    fn: 'root',

    stall: 0,

    timeout: 60000,

    _debug: false
};
