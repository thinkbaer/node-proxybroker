// import * as Promise from 'bluebird'

import db_queries from "./migrations";
import {Config} from "../lib/proxy_broker";
import {DBObject} from "./schema";

import * as sdb from "sqlite"

interface Statement {
    sql: string;
    lastID: number;
    changes: number;

    get(): Promise<any>
    stmt: Statement
}


export interface MigrateSpec {
    from?: string,
    version: string
    queries: Array<string>
}

export default class DB {

    db_source: string
    _db: any

    constructor(cfg: Config) {
        this.db_source = cfg.db_source
    }

    open(): Promise<any> {
        let self = this
        return Promise.resolve()
            .then(() => {
                return sdb.open(this.db_source)
            })
            .then((_db) => {
                self._db = _db
                return _db
            })
    }

    bootstrap(): Promise<any> {

        let self = this
        let db_version: string = null
        return this.open()
            .then((_db) => {
                return _db.exec('CREATE TABLE IF NOT EXISTS variable (key VARCHAR(32) NOT NULL, value TEXT NOT NULL)')
            })
            .then((_db) => {
                return _db.get('SELECT * FROM variable WHERE key = ?', 'db_version')
            })
            .then((res: any) => {
                db_version = '000'
                if (res) {
                    db_version = res.value
                } else {
                    return self._db.exec('INSERT INTO variable (key, value) VALUES (\'db_version\',\'' + db_version + '\')')
                }
            })
            .then(function () {
                return self.migrate(db_version)
            })
            .catch((err) => console.error(err))

    }


    migrate_operation(version: string = '000', up: boolean = true): MigrateSpec {
        var queries: Array<any> = []
        var verify: Array<any> = []
        var key = 'up'

        if (up) {
            key = 'up'
            verify = db_queries
        } else {
            key = 'down'
            verify = db_queries.reverse()
        }

        let v_idx: number = -1
        let _version: string = null

        for (let i = 0; i < verify.length; i++) {
            if (verify[i].version == version) {
                v_idx = i
                break;
            }
        }

        if (v_idx >= -1) {
            for (let i = v_idx + 1; i < verify.length; i++) {
                _version = verify[i].version
                queries = queries.concat(verify[i][key])
            }
        }

        return {
            version: _version,
            queries: queries
        }
    }


    migrate(version: string = '000', up: boolean = true): Promise<any> {
        let migration_spec = this.migrate_operation(version, up)


        let $p = Promise.resolve()
        if (migration_spec.version) {
            let self = this
            migration_spec.queries.forEach((_q)=> {
                $p = $p.then(()=> {
                    self._db.exec(_q)
                })
            })
            $p = $p
                .then(() => {
                    return self._db.exec('UPDATE variable SET value=\'' + migration_spec.version + '\' WHERE key = \'db_version\'')
                })
                .catch(function (err: Error) {
                    console.error(err)
                })
        }

        return $p.then(() => {
            return migration_spec.version != null
        });
    }

    db() {
        return this._db
    }


    save(obj: DBObject) {
        let self = this
        return Promise.resolve()
            .then(()=> {
                if (obj.id) {
                    return self._db.get('SELECT id FROM ' + obj._ctxt.name + ' WHERE id = ?', obj.id)
                } else {
                    return null
                }
            })
            .then((res: any)=> {
                if (res) {
                    return self.update(obj)
                } else {
                    return self.insert(obj);
                }
            })
            .catch((err: Error) => {
                console.error(err.stack)
                throw err
            })
    }


    buildInsert(obj: DBObject) {
        let _if: string[] = []
        let _iv: string[] = []

        for (let f in obj._ctxt.fields) {
            let field = obj._ctxt.fields[f]
            _if.push(f)
            if (obj[f]) {
                if (field.type == 'number') {
                    _iv.push(obj[f])
                } else if (field.type == 'string') {
                    _iv.push('\'' + obj[f] + '\'')
                } else if (field.type == 'date') {
                    _iv.push('\'' + obj[f].toISOString() + '\'')
                }
            } else {
                _iv.push('NULL')
            }
        }
        let sql = 'INSERT INTO ' + obj._ctxt.name + ' (' + _if.join(',') + ') VALUES (' + _iv.join(',') + ')'
        return sql
    }

    insert(obj: DBObject): Promise<DBObject> {
        let sql = this.buildInsert(obj)
        let self = this
        return Promise.resolve()
            .then(() => {
                return self._db.run(sql)
            })
            .then((statemant: Statement) => {
                obj.id = statemant.stmt.lastID;
                return obj
            })
    }

    buildUpdate(obj: DBObject) {
        let _iv: string[] = []

        for (let f in obj._ctxt.fields) {
            let field = obj._ctxt.fields[f]

            if (obj[f]) {
                if (field.type == 'number') {
                    _iv.push(f + '=' + obj[f])
                } else if (field.type == 'string') {
                    _iv.push(f + '=\'' + obj[f] + '\'')
                } else if (field.type == 'date') {
                    _iv.push(f + '=\'' + obj[f].toISOString() + '\'')
                }
            } else {
                _iv.push(f + ' = NULL')
            }
        }
        let sql = 'UPDATE ' + obj._ctxt.name + ' SET ' + _iv.join(',') + ' WHERE id = ' + obj.id
        return sql
    }

    update(obj: DBObject) {
        let sql = this.buildUpdate(obj)
        let self = this
        return Promise.resolve().then(() => {
            return self._db.run(sql)
        }).then(() => {
            return obj
        })

    }

    remove(obj: DBObject|Array<DBObject>) {

    }

}

