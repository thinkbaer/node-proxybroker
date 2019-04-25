
import {SqliteConnectionOptions} from "typeorm/driver/sqlite/SqliteConnectionOptions";
import {IStorageOptions} from "@typexs/base";

export const TEST_STORAGE_OPTIONS: IStorageOptions = process.env.SQL_LOG ? <SqliteConnectionOptions & IStorageOptions>{
  name: 'default',
  type: "sqlite",
  database: ":memory:",
  synchronize: true,
  connectOnStartup: true,
  logger: "simple-console",
  logging: "all"
  // tablesPrefix: ""

} : <SqliteConnectionOptions & IStorageOptions>{
  name: 'default',
  type: "sqlite",
  database: ":memory:",
  synchronize: true,
  connectOnStartup: true,

};
