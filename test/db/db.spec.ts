import * as assert from 'assert'

import DB from "../../src/db/db";
import db_queries from "../../src/db/migrations";

import {ProxyDBO, VariableDBO} from "../../src/db/schema";


describe('DB', () => {

    describe('basic operation', () => {

        it('test insert build', function () {
            let $DB = new DB({db_source: ':memory:'})
            var p = new ProxyDBO()
            p.ip4 = '127.0.0.1'
            p.port = 8888
            let sql = $DB.buildInsert(p)
            assert.ok(sql)
        })


        it('migrate calc', function () {
            var last = db_queries[db_queries.length - 1]
            var first = db_queries[0]

            let $DB = new DB({db_source: ':memory:'})

            var migrateSpec = $DB.migrate_operation()
            assert.equal(migrateSpec.version, last.version)

            var migrateSpec = $DB.migrate_operation(last.version)
            assert.equal(migrateSpec.version, null)

            var migrateSpec = $DB.migrate_operation('000', false)
            assert.ok(migrateSpec.version, first.version)
        })

    })

    describe('bootstrap memory', () => {
        it('bootstrap', function (done) {
            var last = db_queries[db_queries.length - 1]
            let $DB = new DB({db_source: ':memory:'})

            let v = new VariableDBO()
            v.key = 'db_version'

            $DB.bootstrap()
                .then((mig) => {
                    assert.equal(mig, true, 'Migration initialized')
                    return $DB.get(v)
                })
                .then((res: VariableDBO) => {
                    assert.equal(res.value, last.version)
                    done()
                })
                .catch((err) => {
                    console.error(err);
                    done(err)
                })
        })


        it('save and list single proxy entry', function (done) {

            let $DB = new DB({db_source: ':memory:'})
            $DB.bootstrap()
                .then((mig) => {
                    assert.equal(mig, true, 'Migration initialized')
                    var p = new ProxyDBO()
                    p.ip4 = '127.0.0.1'
                    p.port = 8888

                    return $DB.save(p)
                })
                .then((o) => {
                    assert.equal(o['id'], 1)
                    var p = new ProxyDBO()
                    p.ip4 = '127.0.0.1'
                    p.port = 8889

                    return $DB.save(p)
                })
                .then((o) => {
                    assert.equal(o['id'], 2)
                    return $DB._db.all('SELECT * FROM proxy')
                })
                .then((o) => {
                    assert.equal(o.length, 2)
                    done()
                })
                .catch((err) => {
                    console.error(err.stack);
                    done(err)
                })
        })

        it('save, update and list proxy entries', function (done) {
            let $DB = new DB({db_source: ':memory:'})
            $DB.bootstrap()
                .then(() => {
                    var p = new ProxyDBO()
                    p.ip4 = '127.0.0.1'
                    p.port = 8888
                    return $DB.save(p)
                })
                .then((o: ProxyDBO) => {
                    assert.equal(o.id, 1)
                    // try fetch existing entry
                    var n = new ProxyDBO()
                    n.id = o.id
                    return $DB.get(n)
                })
                .then((o: ProxyDBO) => {
                    assert.equal(o.id, 1)
                    assert.equal(o.ip4, '127.0.0.1')
                    o.ip4 = '127.0.0.2'
                    o.port = 8889
                    return $DB.save(o)
                })
                .then((o: ProxyDBO) => {
                    assert.equal(o.id, 1)
                    return $DB._db.all('SELECT * FROM proxy')
                })
                .then((o: ProxyDBO[]) => {
                    assert.equal(o.length, 1)
                    assert.equal(o[0].ip4, '127.0.0.2')
                    assert.equal(o[0].port, 8889)
                    done()
                })
                .catch((err) => {
                    console.error(err);
                    done(err)
                })
        })
    })

})
