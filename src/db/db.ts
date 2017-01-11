// import * as Promise from 'bluebird'

import db_queries from "./migrations";
import {Config} from "../lib/proxy_broker";
import {DBObject, SObject, VariableDBO, SVariable} from "./schema";

import * as sdb from "sqlite"
import {isNumber} from "util";
import {createTable} from "./helper";

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
        let v = new VariableDBO()
        v.key = 'db_version'
        return this.open()
            .then((_db) => {
                let sql = createTable(SVariable);
                return _db.exec(sql)
            })
            .then((_db) => {
                return self.get(v)
            })
            .then((res: any) => {
                v.value = db_version = '000'
                if (res) {
                    v.value = res.value
                } else {
                    return self.insert(v)
                }
            })
            .then(function () {
                return self.migrate(db_version)
            })
            .catch((err) => console.error(err.stack))

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
                    return self._db.exec(_q)
                })
            })
            $p = $p
                .then(() => {
                    let v = new VariableDBO()
                    v.key = 'db_version'
                    v.value = migration_spec.version
                    return self.update(v)
                })
                .catch(function (err: Error) {
                    console.error(err.stack)
                    throw err
                })
        }

        return $p.then(() => {
            return migration_spec.version != null
        });
    }

    db() {
        return this._db
    }

    exists(tmpl: DBObject): Promise<DBObject> {
        return this.get(tmpl, true)
    }

    get(tmpl: DBObject, exists: boolean = false): Promise<DBObject> {
        let self = this
        let keys: any[] = []
        if (typeof tmpl._ctxt.pk === 'string') {
            keys.push(tmpl._ctxt.pk)
        } else {
            keys = keys.concat(tmpl._ctxt.pk)
        }

        var args: any[] = []

        for (let k of keys) {
            var v = tmpl[k]
            if (v) {
                args.push(k + ' = \'' + (typeof v === 'string' ? v.replace('\'', '\\\'') : v) + '\'')
            } else {
                return Promise.resolve(null)
            }
        }

        let select = '*'
        if (exists) {
            select = keys.join(',')
        }

        let str = 'SELECT ' + select + ' FROM ' + tmpl._ctxt.name + ' WHERE ' + args.join(' AND ')

        return Promise.resolve()
            .then(() => {
                return self._db.get(str)
            })
            .then((res: any) => {
                if (res) {
                    for (let k in res) {
                        var field = tmpl._ctxt.fields[k]
                        if (field) {
                            var v = res[k]

                            if (v) {
                                if (field.type == 'date') {
                                    tmpl[k] = new Date(v)
                                } else {
                                    tmpl[k] = v
                                }
                            } else {
                                tmpl[k] = null
                            }

                        } else {
                            throw new Error('Unknown field')
                        }
                    }
                    return tmpl
                } else {
                    return null
                }
            })
    }


    save(obj: DBObject): Promise<DBObject> {
        let self = this
        return Promise.resolve()
            .then(()=> {
                return self.exists(obj)
            })
            .then((res: any)=> {
                if (res) {
                    return self.update(obj)
                } else {
                    return self.insert(obj);
                }
            })
            .catch((err: Error) => {
                console.error(err)
                throw err
            })
    }


    buildInsert(obj: DBObject) {
        let _if: string[] = []
        let _iv: string[] = []

        for (let f in obj._ctxt.fields) {
            let field = obj._ctxt.fields[f]
            if (field.pk && field.auto) continue;
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
                if (obj._ctxt.hasAutoIncField()) {
                    obj[obj._ctxt.getAutoIncField()] = statemant.stmt.lastID;
                }
                return obj
            })
    }

    buildUpdate(obj: DBObject) {
        let _iv: string[] = []
        let where: any[] = []

        for (let f in obj._ctxt.fields) {
            let field = obj._ctxt.fields[f]
            if (field.pk) {
                if (obj[f]) {
                    if (field.type == 'number') {
                        where.push(f + '=' + obj[f])
                    } else if (field.type == 'string') {
                        where.push(f + '=\'' + obj[f] + '\'')

                    }
                } else {
                    throw new Error('No valid pk found')
                }
                continue;
            }

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
        let sql = 'UPDATE ' + obj._ctxt.name + ' SET ' + _iv.join(',') + ' WHERE ' + where.join(' AND ')
        return sql
    }

    update(obj: DBObject): Promise<DBObject> {
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

