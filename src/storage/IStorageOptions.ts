



import {BaseConnectionOptions} from "typeorm/connection/BaseConnectionOptions";
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";

export interface IStorageOptions extends BaseConnectionOptions {


}

export const K_STORAGE:string = 'storage';