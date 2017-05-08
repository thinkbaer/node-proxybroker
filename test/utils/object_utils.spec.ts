import * as chai from 'chai'
import {importClassesFromDirectories} from "../../src/utils/DirectoryExportedClassesLoader";
import {createObjectByType} from "../../src/utils/ObjectUtils";
import {inspect} from "util";
let expect = chai.expect





interface ITest {

    somename?: string

    test(): string;
}

describe('utils/ObjectUtils testing', () => {

    it('create object for type', () => {
        let paths = [__dirname + '/classloading/dir_with_classes/*']
        let loaded = importClassesFromDirectories(paths)
        let cls = loaded.shift()
        let obj: ITest = createObjectByType<ITest>(cls)

        let str = "Cls01 {\n  somename: \'initialized\',\n  othername: \'othername\',\n  someothername: \'someothername\' }"

        let c = inspect(obj)
        expect(c).to.be.eq(str)
        expect(obj.somename).to.be.eq('initialized')
        let ret = obj.test()
        expect(ret).to.be.eq('test called')





    })
})