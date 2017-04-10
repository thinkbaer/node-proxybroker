import * as assert from 'assert'

import DB from "../../src/db/db";
import db_queries from "../../src/db/migrations";

import {ProxyDBO, VariableDBO} from "../../src/db/schema";
import {Registry, ProxyHandle} from "../../src/lib/registry";


xdescribe('Registry', () => {

    xdescribe('Operations', () => {

        let $DB = new DB({db_source: ':memory:'})

        before((done)=> {
            $DB.bootstrap()
                .then(() => done())
                .catch((err: Error)=>done(err))
        })

        it('lookupProxy: empty, save, found', function (done) {
            let registry = new Registry($DB)

            registry.lookupProxy('127.0.0.1', 8888)
                .then(function (handle: ProxyHandle) {
                    assert.ok(handle.object)
                    assert.equal(handle.object.id, null)
                    return handle.save()
                })
                .then(function (handle: ProxyHandle) {
                    assert.ok(handle.object)
                    assert.equal(handle.object.id, 1)
                    return registry.lookupProxy('127.0.0.1', 8888)
                })
                .then(function (handle: ProxyHandle) {
                    assert.ok(handle.object)
                    assert.equal(handle.object.id, 1)

                })
                .then(()=>done())
                .catch(err=>done(err))
        })

        it('enqueue', function (done) {
            let registry = new Registry($DB)
            registry.on('waiting', () => done())
            registry.enqueue('127.0.0.1', 8888);
        })


        it('ProxyHandle: validate', function(done)  {
            this.skip()
            let registry = new Registry($DB)
            let handle = new ProxyHandle(registry, '127.0.0.1', 8888)
            done()
        })

    })

})
