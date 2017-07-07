import * as mocha from 'mocha';
describe('', () => {
})


import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from 'util'
let cron = require('cron-parser')



/**
 * TODO
 */
//@suite('integration/cron-parser')
class CronParserTests {



    'pattern'() {
        let exp = cron.parseExpression('*/22 * * * *');

        let date = exp.next()

        console.log(date,date.getTime())

    }

}



