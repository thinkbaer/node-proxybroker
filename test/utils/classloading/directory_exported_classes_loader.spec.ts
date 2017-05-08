
import * as chai from 'chai'
let expect = chai.expect


import {importClassesFromDirectories} from "../../../src/utils/DirectoryExportedClassesLoader";

describe('Loading classes',() => {

    it('load one class from a directory',() => {
        let paths = [__dirname + '/dir_with_classes/*']
        let loaded = importClassesFromDirectories(paths)
        expect(loaded).not.to.be.empty
        let cls = loaded.shift()
        expect(cls).to.exist
        expect(cls.name).to.be.eq('Cls01')
    })

})