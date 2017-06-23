/**
 *
 * @see https://github.com/typeorm/typeorm/blob/master/src/util/DirectoryExportedClassesLoader.ts
 *
 */


import {PlatformUtils} from "./PlatformUtils";
import {StringOrFunction} from "../types";
import {Utils} from "./Utils";



/**
 * Loads all exported classes from the given directory.
 */
export class ClassLoader {

    static createObjectByType<T>(obj:Function,...args:any[]) : T {
        /* Try 01
         let tmp: any  = Object.create(obj.prototype);
         let _obj:T  = tmp as T
         */

        let _obj:T = Reflect.construct(obj,args)
        return _obj
    }

    static importClassesFromAny(o: StringOrFunction[]):Function[] {

        let klasses: Function[] = []

        o.forEach(x => {
            if (Utils.isString(x)) {
                let _x = PlatformUtils.pathNormilize(PlatformUtils.pathResolve(<string>x))
                    let exported = ClassLoader.importClassesFromDirectories([_x])
                    klasses = klasses.concat.apply(klasses,exported)
            } else if (x instanceof Function) {
                klasses.push(x)
            } else {
                throw new Error('TODO: unknown '+x)
            }
        })
        return klasses
    }

    private static loadFileClasses(exported: any, allLoaded: Function[]) {
        if (exported instanceof Function) {
            allLoaded.push(exported);

        } else if (exported instanceof Object) {
            Object.keys(exported).forEach(key => this.loadFileClasses(exported[key], allLoaded));

        } else if (exported instanceof Array) {
            exported.forEach((i: any) => this.loadFileClasses(i, allLoaded));
        }

        return allLoaded;
    }

    static importClassesFromDirectories(directories: string[], formats = [".js", ".ts"]): Function[] {

        const allFiles = directories.reduce((allDirs, dir) => {
            let x = PlatformUtils.pathNormilize(dir)
            let y = PlatformUtils.load("glob").sync(x)
            return allDirs.concat(y);
        }, [] as string[]);

        const dirs = allFiles
            .filter(file => {
                const dtsExtension = file.substring(file.length - 5, file.length);
                return formats.indexOf(PlatformUtils.pathExtname(file)) !== -1 && dtsExtension !== ".d.ts";
            })
            .map(file => PlatformUtils.load(PlatformUtils.pathResolve(file)));

        return this.loadFileClasses(dirs, []);
    }


    /**
     * Loads all json files from the given directory.
     */
    static importJsonsFromDirectories(directories: string[], format = ".json"): any[] {

        const allFiles = directories.reduce((allDirs, dir) => {
            return allDirs.concat(PlatformUtils.load("glob").sync(PlatformUtils.pathNormilize(dir)));
        }, [] as string[]);

        return allFiles
            .filter(file => PlatformUtils.pathExtname(file) === format)
            .map(file => PlatformUtils.load(PlatformUtils.pathResolve(file)));
    }
}