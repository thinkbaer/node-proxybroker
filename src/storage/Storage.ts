import * as path from 'path';
import * as _ from 'lodash'
import {Connection, ConnectionManager, ConnectionOptions, createConnection, getConnectionManager} from "typeorm";
import {IStorageOptions} from "./IStorageOptions";


import {Config} from "commons-config";
import {K_STORAGE, K_WORKDIR} from "../types";
import {Utils} from "../utils/Utils";
import {Variable} from "./entity/Variable";
import {IpAddrState} from "./entity/IpAddrState";
import {IpAddr} from "./entity/IpAddr";
import {ConnectionWrapper} from "./ConnectionWrapper";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";

import {IpLoc} from "./entity/IpLoc";


export const FIX_STORAGE_OPTIONS = {
    entities: [
        Variable, IpAddrState, IpAddr,IpLoc
    ],
    migrations: [
        __dirname + "/migrations/*"
    ],
    autoSchemaSync: true
}


export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions>{
    name: 'default',
    type: "sqlite",
    database: ":memory:",
    tablesPrefix: "npb_"

}


export class Storage {

    private _name: string = null

    // if memory then on connection must be permanent
    private memory: boolean = false


    private connections: ConnectionWrapper[] = []


    private options: IStorageOptions = null

    private static $$: Storage = null

    constructor(options: IStorageOptions = DEFAULT_STORAGE_OPTIONS) {

        // check if options are set per config
        let _options = <IStorageOptions>Config.get(K_STORAGE)
        if (_options) {
            options = _options
        }

        // Apply some unchangeable and fixed options
        options = Utils.merge(options, FIX_STORAGE_OPTIONS)

        if (options.type == 'sqlite') {
            let opts = <SqliteConnectionOptions>options
            if (opts.database != ':memory:' &&
                !_.isEmpty(opts.database) &&
                !path.isAbsolute(opts.database)) {
                // TODO check if file exists
                let _path = Config.get(K_WORKDIR) + '/' + opts.database
                options = Utils.merge(options, {type: 'sqlite', database: _path})
            }
        }

        this.options = Object.assign({}, DEFAULT_STORAGE_OPTIONS, options)
        this._name = this.options.name
        if (this.options.type == 'sqlite' && this.options['database'] == ':memory:') {
            this.memory = true
        }
    }

    get name() {
        return this._name
    }

    get isMemory() {
        return this.memory
    }


    async init(): Promise<void> {
        if (!getConnectionManager().has(this.name)) {
            let c = await getConnectionManager().create(<ConnectionOptions>this.options);
            c = await c.connect()
            await (await this.wrap(c)).close();
        } else {
            await (await this.wrap()).close()
        }
        return Promise.resolve()
    }

    async wrap(conn?: Connection): Promise<ConnectionWrapper> {
        let wrapper: ConnectionWrapper = null
        if ((this.memory && this.connections.length == 0) || !this.memory) {
            if (conn) {
                wrapper = new ConnectionWrapper(this, conn)
            } else {
                wrapper = new ConnectionWrapper(this)
            }

            this.connections.push(wrapper)
        } else if (this.memory && this.connections.length == 1) {
            wrapper = this.connections[0]
        }
        return Promise.resolve(wrapper)
    }


    size() {
        return this.connections.length
    }

    async connect(): Promise<ConnectionWrapper> {
        return (await this.wrap()).connect()
    }

    async shutdown(): Promise<any> {
        let ps: Promise<any>[] = []
        while (this.connections.length > 0) {
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