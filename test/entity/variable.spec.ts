import * as assert from 'assert'


import {Variable} from "../../src/entity/variable";
import {createConnection} from "typeorm";

describe('Entity: Variable', () => {

    it('memory', function (done) {

        let variable = new Variable()
        createConnection({
            driver: {
                type: "sqlite",
                storage: ":memory:"
            },
            entities: [
               __dirname + "../../src/entity/*.js"
            ],
            migrations: [
               __dirname + "../../src/migrations/*.js"
            ],
            autoSchemaSync: true,
        }).then(connection => {

            variable.key = 'hallo'
            variable.value = 'ballo'
            return  connection.entityManager.persist(variable)

        }).then(entity => {
            console.log(entity)
            done()
            // here you can start to work with your entities
        }).catch(error => {done(error)});


    })

})
