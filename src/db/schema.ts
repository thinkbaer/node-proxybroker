export interface SObject {
    name: string
    fields: {[key: string]: {type: string,length?: number,default?:string,null?:boolean}}
    unique?:{[key: string]: string[]}
}

export interface DBObject {
    _ctxt: SObject
    id:number
    updated_at:Date
    created_at:Date
    [key:string]:any
}

export const SProxy:SObject = {
    name: 'proxy',

    fields: {
        ip4: {type: 'string', length: 15},
        port: {type: 'number'},
        country: {type: 'string', length: 2, null:true},
        checked_at: {type: 'date',null:true},
        created_at: {type: 'date',default:'(datetime(\'now\',\'localtime\'))'},
        updated_at: {type: 'date',default:'(datetime(\'now\',\'localtime\'))'}
    },

    unique:{
        proxy_ip_port:['ip4','port']
    }
}


export default class ProxyDBObject implements DBObject {

    _ctxt: SObject = SProxy

    id: number;
    ip4:string
    port: number
    country: string
    checked_at:Date = null
    created_at:Date = new Date()
    updated_at:Date = new Date()

    protocols: Array<string>
    types: Array<string>

    constructor(){}

}