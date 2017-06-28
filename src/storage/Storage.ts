import * as path from 'path';
import * as _ from 'lodash'
import {Connection, createConnection, getConnectionManager} from "typeorm";
import {IStorageOptions} from "./IStorageOptions";


import {Config} from "commons-config";
import {K_STORAGE, K_WORKDIR} from "../types";
import {Utils} from "../utils/Utils";
import {Variable} from "./entity/Variable";
import {IpAddr} from "./entity/IpAddr";
import {ConnectionWrapper} from "./ConnectionWrapper";


export const FIX_STORAGE_OPTIONS = {
    entities: [
        Variable, IpAddr
    ],
    migrations: [
        __dirname + "/migrations/*"
    ],
    autoSchemaSync: true
}


export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = {
    driver: {
        type: "sqlite",
        storage: ":memory:",
        tablesPrefix: "npb_"
    }
}


export class Storage {

    // if memory then on connection must be permanent
    private memory: boolean = false



    private connections: ConnectionWrapper[] = []


    private options: IStorageOptions = null

    private static $$: Storage = null

    constructor(options: IStorageOptions = DEFAULT_STORAGE_OPTIONS) {

        // Apply some unchangeable and fixed options
        options = Utils.merge(options, FIX_STORAGE_OPTIONS)

        if (options.driver &&
            options.driver.type == 'sqlite' &&
            options.driver.storage != ':memory:' &&
            !_.isEmpty(options.driver.storage) &&
            !path.isAbsolute(options.driver.storage)) {
            // TODO check if file exists
            let _path = Config.get(K_WORKDIR) + '/' + options.driver.storage
            options = Utils.merge(options, {driver: {type: 'sqlite', storage: _path}})
        } else {
            let _options = <IStorageOptions>Config.get(K_STORAGE)
            if (_options) {
                options = _options
            }
        }

        this.options = Object.assign({}, DEFAULT_STORAGE_OPTIONS, options)
        if (this.options.driver.type == 'sqlite' && this.options.driver.storage == ':memory:') {
            this.memory = true
        }
    }

    get isMemory(){
        return this.memory
    }


    async init(): Promise<void> {
        if(!getConnectionManager().has('default')){
            let c =  await getConnectionManager().createAndConnect(this.options)
            await (await this.wrap(c)).close()
        }else{
            await (await this.wrap()).close()
        }
        return Promise.resolve()
    }

    async wrap(conn?:Connection):Promise<ConnectionWrapper>{
        let wrapper:ConnectionWrapper = null
        if((this.memory && this.connections.length == 0) || !this.memory){
            if(conn){
                wrapper = new ConnectionWrapper(this, conn)
            }else{
                wrapper = new ConnectionWrapper(this)
            }

            this.connections.push(wrapper)
        }else if (this.memory && this.connections.length == 1){
            wrapper = this.connections[0]
        }
        return Promise.resolve(wrapper)
    }


    size(){
        return this.connections.length
    }

    async connect(): Promise<ConnectionWrapper> {
        return (await this.wrap()).connect()
    }

    async shutdown() : Promise<any>{
        let ps : Promise<any>[] = []
        while(this.connections.length > 0){
            ps.push(this.connections.shift().close())
        }
        return Promise.all(ps)
    }


    static async $(options: IStorageOptions = DEFAULT_STORAGE_OPTIONS): Promise<Storage> {
        if (!this.$$) {
            this.$$ = new Storage(options)
            await this.$$.init()
        }
        return Promise.resolve(this.$$)
    }



}