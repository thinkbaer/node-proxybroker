import * as path from "path";
import * as _ from "lodash";
import {Connection, ConnectionOptions, getConnectionManager} from "typeorm";
import {IStorageOptions} from "./IStorageOptions";


import {Config} from "commons-config";
import {K_WORKDIR} from "../types";
import {Utils} from "../utils/Utils";
import {ConnectionWrapper} from "./ConnectionWrapper";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";


import {Runtime} from "../Runtime";
import {PlatformUtils} from "../utils/PlatformUtils";
import TodoException from "../exceptions/TodoException";
import {Log} from "../logging/Log";




export const DEFAULT_STORAGE_OPTIONS: IStorageOptions = <SqliteConnectionOptions>{
    name: 'default',
    type: "sqlite",
    database: ":memory:",
    tablesPrefix: "npb_"

};


export class Storage {

    private _name: string = null;

    // if memory then on connection must be permanent
    private singleConnection: boolean = false;


    private connections: ConnectionWrapper[] = [];


    private options: IStorageOptions = null;

    private static $$: Storage = null;

    constructor(options: IStorageOptions = DEFAULT_STORAGE_OPTIONS, FIX_STORAGE_OPTIONS: IStorageOptions = {}) {

        // check if options are set per config
        /*
        let _options = <IStorageOptions>Config.get(K_STORAGE);
        if (_options) {
            options = _options
        }
        */


        // Apply some unchangeable and fixed options
        options = Utils.merge(options, FIX_STORAGE_OPTIONS);

        if (options.type == 'sqlite') {
            let opts = <SqliteConnectionOptions>options;
            if (opts.database != ':memory:' &&
                !_.isEmpty(opts.database) &&
                !path.isAbsolute(opts.database)) {
                // TODO check if file exists

                let possibleFiles = []
                possibleFiles.push(PlatformUtils.pathResolveAndNormalize(opts.database));

                let _path = Config.get(K_WORKDIR, process.cwd()) + '/' + opts.database;
                possibleFiles.push(PlatformUtils.pathResolveAndNormalize(_path));

                let found = false
                for (let test of possibleFiles) {
                    if (PlatformUtils.fileExist(test) || PlatformUtils.fileExist(PlatformUtils.directory(test))) {
                        options = Utils.merge(options, {type: 'sqlite', database: test})
                        found = true
                    }
                }

                if (!found) {
                    throw new TodoException('File ' + opts.database + ' for database can\'t be found.')
                }

            }
        }

        this.options = Object.assign({}, DEFAULT_STORAGE_OPTIONS, options);
        this._name = this.options.name;

        if (this.options.type == 'sqlite' /*&& this.options['database'] == ':memory:'*/) {
            this.singleConnection = true
        }

        let out = ""
        for(let x in this.options){
            if(typeof this.options[x] === 'string'){
                out += "\t"+x+" = "+this.options[x]+"\n"
            }
        }
        Log.info(`storage: use ${this.options.type} for storage with options:\n${out} `)
        Runtime.$().setConfig('storage', this.options)
    }

    get name() {
        return this._name
    }

    get isSingleConnection() {
        return this.singleConnection
    }


    async prepare(): Promise<void> {
        if (!getConnectionManager().has(this.name)) {
            let c = await  getConnectionManager().create(<ConnectionOptions>this.options);
            c = await c.connect();
            await(await this.wrap(c)).close();
        }
        else {
            await(await this.wrap()).close()
        }
        return Promise.resolve()
    }

    async wrap(conn ?: Connection): Promise<ConnectionWrapper> {
        let wrapper: ConnectionWrapper = null;
        if ((this.singleConnection && this.connections.length == 0) || !this.singleConnection) {
            if (conn) {
                wrapper = new ConnectionWrapper(this, conn)
            } else {
                wrapper = new ConnectionWrapper(this)
            }

            this.connections.push(wrapper)
        } else if (this.singleConnection && this.connections.length == 1) {
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
        let name = this.name
        let ps: Promise<any> [] = [];
        while (this.connections.length > 0) {
            ps.push(this.connections.shift().close(true));
        }

        return Promise.all(ps).then(() => {
            // remove connection definition from typeorm
            _.remove(getConnectionManager()['connections'], (connection) => {
                return connection.name === name;
            });

            Log.info(`storage: shutdown`)
        })
    }


    static async $(options: IStorageOptions = DEFAULT_STORAGE_OPTIONS, FIX_STORAGE_OPTIONS: IStorageOptions = {}): Promise<Storage> {
        if (!this.$$) {
            this.$$ = new Storage(options,FIX_STORAGE_OPTIONS);
            await this.$$.prepare()
        }
        return Promise.resolve(this.$$)
    }


}