import * as path from 'path';
import {Connection, createConnection, getConnectionManager} from "typeorm";
import {IStorageOptions} from "./IStorageOptions";
import {Log} from "../logging/logging";
import {merge, mergeDeep} from "typescript-object-utils";
import {Config} from "commons-config";
import {K_WORKDIR} from "../types";




export const FIX_STORAGE_OPTIONS = {
    entities: [
        __dirname + "/../entity/*"
    ],
    migrations: [
        __dirname + "/../migrations/*"
    ],
    autoSchemaSync: true
}



export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = {
    driver: {
        type: "sqlite",
        storage: ":memory:",
        tablesPrefix:"npb_"
    }
}


export class Storage {

    private _connection: Connection = null

    private options: IStorageOptions = null

    constructor(options: IStorageOptions = DEFAULT_STORAGE_OPTIONS) {

        // Apply some unchangeable and fixed options
        options = merge(options, FIX_STORAGE_OPTIONS)

        if(options.driver && options.driver.type == 'sqlite' && options.driver.storage != ':memory:' && !path.isAbsolute(options.driver.storage)){
            // TODO check if file exists
            let _path = Config.get(K_WORKDIR) + '/' + options.driver.storage
            options = mergeDeep(options, {driver:{storage:_path}})
        }

        this.options = Object.assign({}, DEFAULT_STORAGE_OPTIONS, options)
    }

    init(): Promise<void> {
        this._connection = getConnectionManager().create(this.options)
        return this.connection
            .connect()
            .then(conn => {
                return conn.close()
            })
    }

    get connection(): Connection {
        return this._connection;
    }


}