import {Connection, createConnection, getConnectionManager} from "typeorm";
import {StorageOptions} from "./StorageOptions";
import {Config} from "../config/Config";
import {Log} from "../lib/logging";

const INITIAL_STORAGE_OPTIONS: StorageOptions = {
    driver: {
        type: "sqlite",
        storage: ":memory:"
    }

}

const DEFAULT_STORAGE_OPTIONS: StorageOptions = {
    driver: {
        type: "sqlite",
        storage: ":memory:"
    },
    entities: [
        __dirname + "/../entity/*"
    ],
    migrations: [
        __dirname + "/../migrations/*"
    ],
    autoSchemaSync: true
}

export class Storage {

    private conn: Connection = null

    private options: StorageOptions = null

    constructor(options: StorageOptions = INITIAL_STORAGE_OPTIONS) {
        this.options = Object.assign({}, DEFAULT_STORAGE_OPTIONS, options)
        console.log(this.options)
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