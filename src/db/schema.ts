

export class SObject {
    name: string
    fields: {[key: string]: {type: string,length?: number,default?:string,null?:boolean,auto?:boolean,pk?:boolean}}
    unique?:{[key: string]: string[]}
    pk: string|string[]
    // new: Function

    [k:string]:any

    constructor(any:any){
        for(let f in any){
            this[f] = any[f]
        }
    }

    hasAutoIncField(){
        return this.getAutoIncField() != null
    }

    getAutoIncField(){
        for(let f in this.fields){
            if(this.fields[f].auto){
                return f
            }
        }
        return null
    }
}

export interface DBObject {
    _ctxt: SObject
    [key:string]:any
}

export const SProxy:SObject = new SObject({
    name: 'proxy',

    fields: {
        id: {type:'number',auto:true,pk:true},
        ip4: {type: 'string', length: 15},
        port: {type: 'number'},
        status: {type: 'number'},
        country: {type: 'string', length: 2, null:true},
        checked_at: {type: 'date',null:true},
        created_at: {type: 'date',default:'(datetime(\'now\',\'localtime\'))'},
        updated_at: {type: 'date',default:'(datetime(\'now\',\'localtime\'))'}
    },

    pk: 'id',

    unique:{
        proxy_ip_port:['ip4','port']
    },

 //   new:() => {return new ProxyDBO()}
})


export const SVariable:SObject = new SObject({
    name: 'variable',

    fields: {
        key: {type:'string', length:64, pk:true, null:false},
        value: {type: 'string', null:false},
    },

    pk: 'key',

   // new:() => {return new VariableDBO()}
})


export class ProxyDBO implements DBObject {

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



}

export class VariableDBO implements DBObject {

    _ctxt: SObject = SVariable

    key: string
    value: string
}