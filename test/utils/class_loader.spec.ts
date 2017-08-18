import {suite, test} from "mocha-typescript";
import {expect} from "chai";
import {inspect} from "util";

import {ClassLoader} from "../../src/libs/generic/utils/ClassLoader";
describe('', () => {
});


interface ITest {
    somename?: string;
    test(): string;
}

@suite('utils/ClassLoader loading classes')
class ClassLoaderTest {


    @test
    'load one class from a directory'() {
        let paths = [__dirname + '/testcase/dir_with_classes/*'];
        let loaded = ClassLoader.importClassesFromDirectories(paths);
        expect(loaded).not.to.be.empty;
        let cls = loaded.shift();
        expect(cls).to.exist;
        expect(cls.name).to.be.eq('Cls01')
    }

    @test
    'create object for type'() {
        let paths = [__dirname + '/testcase/dir_with_classes/*'];
        let loaded = ClassLoader.importClassesFromDirectories(paths);
        let cls = loaded.shift();
        let obj: ITest = ClassLoader.createObjectByType<ITest>(cls);

        let str = "Cls01 {\n  somename: \'initialized\',\n  othername: \'othername\',\n  someothername: \'someothername\' }";

        let c = inspect(obj);

        expect(c).to.be.eq(str);
        expect(obj.somename).to.be.eq('initialized');
        let ret = obj.test();
        expect(ret).to.be.eq('test called')
    }

}