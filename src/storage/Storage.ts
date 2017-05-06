import * as path from 'path';
import {Connection, createConnection, getConnectionManager} from "typeorm";
import {StorageOptions} from "./StorageOptions";
import {Config} from "../config/Config";
import {Log} from "../lib/logging";
import {merge, mergeDeep} from "typescript-object-utils";




export const FIX_STORAGE_OPTIONS = {
    entities: [
        __dirname + "/../entity/*"
    ],
    migrations: [
        __dirname + "/../migrations/*"
    ],
    autoSchemaSync: true
}



export const DEFAULT_STORAGE_OPTIONS: StorageOptions = {
    driver: {
        type: "sqlite",
        storage: ":memory:",
        tablesPrefix:"npb_"
    }
}


export class Storage {

    private conn: Connection = null



    private options: StorageOptions = null

    constructor(config : Config) {
        let options: StorageOptions = DEFAULT_STORAGE_OPTIONS
        // Apply some unchangeable and fixed options
        options = merge(config.options.storage,FIX_STORAGE_OPTIONS)

        if(options.driver && options.driver.type == 'sqlite' && options.driver.storage != ':memory:' && !path.isAbsolute(options.driver.storage)){
            // TODO check if file exists
            let _path = config.options.workdir + '/' + options.driver.storage
            console.log(options)
            options = mergeDeep(options, {driver:{storage:_path}})
            console.log(options)
        }


        this.options = Object.assign({}, DEFAULT_STORAGE_OPTIONS, options)
    }

    init(): Promise<void> {
        this.conn = getConnectionManager().create(this.options)
        return this.connection
            .connect()
            .then(conn => {
                return conn.close()
            })
    }

    get connection(): Connection {
        return this.conn;
    }


}