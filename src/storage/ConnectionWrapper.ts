import {Connection, EntityManager, getConnectionManager} from "typeorm";
import {Storage} from "./Storage";
import {deprecate} from "util";
export class ConnectionWrapper {

    static $INC: number = 0

    inc: number = ConnectionWrapper.$INC++

    private name:string = null

    memory: boolean = false

    storage: Storage

    connection: Connection

    constructor(s: Storage, conn?: Connection) {
        this.storage = s
        this.memory = this.storage.isMemory
        this.connection = conn
        this.name = this.storage.name
    }

    /**
     * Persists (saves) all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     *
     * @deprecated
     */
    async persist<Entity>(o: Entity): Promise<any> {
        return this.manager.persist(o)
    }

    async save<Entity>(o: Entity): Promise<any> {
        return this.manager.save(o)
    }

    async connect(): Promise<ConnectionWrapper> {
        if (this.memory) {
            if (!this.connection || !this.connection.isConnected) {
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

    async close(): Promise<ConnectionWrapper> {
        if (!this.memory) {
            if (this.connection.isConnected) {
                await this.connection.close();
            }
        }
        return Promise.resolve(this)
    }

}