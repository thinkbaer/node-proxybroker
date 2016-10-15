/**
 * Created by cezaryrk on 15.10.16.
 */

export interface ProxySpec {
    addr: string
    port: number
    level: number
    has_gateway:boolean
    country:string
    protocols: Array<string>
    types: Array<string>

}