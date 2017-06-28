import {Connection, getConnectionManager} from "typeorm";
import {Storage} from "./Storage";
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

    async persist<Entity>(o: Entity): Promise<any> {
        return this.connection.entityManager.persist(o)
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

    async close(): Promise<ConnectionWrapper> {
        if (!this.memory) {
            if (this.connection.isConnected) {
                await this.connection.close();
            }
        }
        return Promise.resolve(this)
    }

}