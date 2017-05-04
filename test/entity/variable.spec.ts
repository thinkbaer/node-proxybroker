import * as assert from 'assert'


import {Variable} from "../../src/entity/Variable";
import {createConnection, getConnectionManager} from "typeorm";


describe('Entity: Variable', () => {



    it('memory',  function () {

        let variable = new Variable()

        let con = getConnectionManager().create({
            driver: {
                type: "sqlite",
                storage: ":memory:"
            },
            entities: [
                //__dirname + "../../../src/entity/*.js"
            ],
            migrations: [
                //__dirname + "../../src/migrations/*.js"
            ],
            autoSchemaSync: true,

        })

        con.importEntities([Variable])

        // let co = await con.connect()

        /*
        con.connect()
            .then(connection => {
                return connection.syncSchema(false)
            })
            .then(entity => {
                variable.key = 'hallo'
                variable.value = 'ballo'
                return con.entityManager.persist(variable)

            })
            .then(entity => {
                console.log(entity)
                return con.close()
            })
            .then(entity => {
                done()
                // here you can start to work with your entities
            })
            .catch(error => {
                done(error)
            });
*/

    })

})
