import {SqliteConnectionOptions} from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import {PostgresConnectionOptions} from 'typeorm/driver/postgres/PostgresConnectionOptions';
import {IStorageOptions} from '@typexs/base';

export const TEST_STORAGE_OPTIONS: IStorageOptions = process.env.SQL_LOG ? <SqliteConnectionOptions & IStorageOptions>{
  name: 'default',
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  connectOnStartup: true,
  logger: 'simple-console',
  logging: 'all'
  // tablesPrefix: ""

} : <SqliteConnectionOptions & IStorageOptions>{
  name: 'default',
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  connectOnStartup: true,

};

export const TEST_PSQL_STORAGE_OPTIONS: IStorageOptions = process.env.SQL_LOG ? <PostgresConnectionOptions & IStorageOptions>{
  name: 'default',
  type: 'postgres',
  database: 'proxybroker',
  username: 'proxybroker',
  port: 5432,
  synchronize: true,
  logger: 'simple-console',
  logging: 'all'
  // tablesPrefix: ""

} : <PostgresConnectionOptions & IStorageOptions>{
  name: 'default',
  type: 'postgres',
  database: 'proxybroker',
  username: 'proxybroker',
  port: 5432,
  synchronize: true,

};
