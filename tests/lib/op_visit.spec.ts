import * as assert from 'assert'
import {Visit} from "../../src/lib/op_visit";


describe('Test operation: visit', () => {


    it('exec: simple get "http://de.wikipedia.org"', function (done) {
        let visit = new Visit('http://de.wikipedia.org')
        let visitExec = visit.executor()

        visitExec.exec(() => {
            assert.ok(visitExec.content, 'Content loaded.')
            done()
        })
    })

    it('exec: simple get file"', function (done) {
        let file = __dirname + '/../data/extract_content.html'
        let visit = new Visit(file)
        let visitExec = visit.executor()

        visitExec.exec(() => {
            assert.ok(visitExec.content, 'Content loaded.')
            done()
        })
    })

    // TODO Test: File not exists



})
