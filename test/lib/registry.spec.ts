import * as assert from 'assert'

import DB from "../../src/db/db";
import db_queries from "../../src/db/migrations";

import {ProxyDBO, VariableDBO} from "../../src/db/schema";
import {Registry} from "../../src/lib/registry";


describe('Registry', () => {

    describe('Enqueue', () => {

        let $DB = new DB({db_source: ':memory:'})

        before((done)=>{
            $DB.bootstrap().then(() => done()).catch((err:Error)=>done(err))
        })

        it('enqueue', function (done) {
           let registry = new Registry($DB)

            registry.enqueue('127.0.0.1','8888')




        })






    })

})
