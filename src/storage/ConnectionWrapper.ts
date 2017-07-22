import {Connection, EntityManager, getConnectionManager} from "typeorm";
import {Storage} from "./Storage";
import {Log} from "../lib/logging/Log";

export class ConnectionWrapper {

    static $INC: number = 0;

    inc: number = ConnectionWrapper.$INC++;

    private name:string = null;

    singleConnection: boolean = false;

    storage: Storage;

    connection: Connection;

    constructor(s: Storage, conn?: Connection) {
        this.storage = s;
        this.singleConnection = this.storage.isSingleConnection;
        this.connection = conn;
        this.name = this.storage.name
    }

    /**
     * Persists (saves) all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     *
     * @deprecated
     */
    async persist<Entity>(o: Entity): Promise<any> {
        return this.manager.save(o)
    }

    async save<Entity>(o: Entity): Promise<any> {
        try {
            return this.manager.save(o)
        }catch(err){
            Log.error(err)
            throw err
        }
    }

    async connect(): Promise<ConnectionWrapper> {
        if (this.singleConnection) {
            let has = getConnectionManager().has(this.name)
            if ((!this.connection || !this.connection.isConnected) && has) {
                this.connection = await getConnectionManager().get(this.name)
            }
        } else {
            this.connection = await getConnectionManager().get(this.name)
        }
        return Promise.resolve(this)
    }

    get manager():EntityManager{
        return this.connection.manager
    }

    async close(force:boolean = false): Promise<ConnectionWrapper> {
        if (!this.singleConnection || force) {
            if (this.connection.isConnected) {
                await this.connection.close();
            }
        }
        return Promise.resolve(this)
    }

}