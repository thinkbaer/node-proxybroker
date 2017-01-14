

export interface API {

    enqueue(ip: string, port: string|number, flags: number) : string;

}

export const enum ProxyType {

    HTTP_ANON = 1,
    HTTPS_ANON = 2

    /*
     HTTP_ANON = <string>'http_anon',
     HTTPS_ANON = 'https_anon'
     */
}


export interface Addr {
    ip: string
    port: number
}

export interface ProxySpec extends Addr {
    flags:number
}


