
import * as assert from 'assert'
import {Visit} from "../../src/lib/op_visit";
import {Extract} from "../../src/lib/op_extract";



describe('Test basic operations', () => {

    describe('op: extract', ()=> {

        /**
         *
         * {
         *      $visit: http://de.wikipedia.org
         *      $extract: [
         *          {$match: 'CSS Selector' },
         *          {$match: 'CSS Selector' },
         *          {$project: {var : '$selector'}}
         *      ]
         * }
         */

        it('exec: simple extract list"', function (done) {
            let file = __dirname + '/../data/extract_content.html'
            let visit = new Visit(file)
            let visitExec = visit.executor()

            let extract = new Extract([
                {$match: 'div#hauptseite-ereignisse'},
            ])
            visit.add(extract)

            visitExec.exec(() => {
                assert.ok(visitExec.content, 'Content loaded.')
                done()
            })
        })

        it('exec: simple extract list 2"', function (done) {
            this.skip()
            let file = __dirname + '/../data/extract_content.html'
            let visit = new Visit(file)
            let visitExec = visit.executor()

            let extract = new Extract([
                {$match: 'div[id=hauptseite-ereignisse]'},
                {$match: 'div[id=mf-wga]'},
            ])
            visit.add(extract)

            visitExec.exec(() => {
                assert.ok(visitExec.content, 'Content loaded.')
                done()
            })
        })

        it('exec: simple extract list 3"', function (done) {
            this.skip()
            let file = __dirname + '/../data/extract_content.html'
            let visit = new Visit(file)
            let visitExec = visit.executor()

            let extract = new Extract([
                {$match: 'div[id=hauptseite-ereignisse]'},
                {$match: 'div[id=mf-wga] ul li'},
                {$project: {entry: {$text:''}}},
            ])
            visit.add(extract)

            visitExec.exec(() => {
                assert.ok(visitExec.content, 'Content loaded.')
                done()
            })
        })


    })


})
