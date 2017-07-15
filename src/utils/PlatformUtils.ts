/**
 *
 * @see https://github.com/typeorm/typeorm/blob/master/src/platform/PlatformTools.ts
 *
 */

import * as path from "path";
import * as fs from "fs";

/**
 * Platform-specific tools.
 */
export class PlatformUtils {

    /**
     * Type of the currently running platform.
     */
    static type: "browser" | "node" = "node";

    /**
     * Gets global variable where global stuff can be stored.
     */
    static getGlobalVariable(): any {
        return global;
    }

    /**
     * Loads ("require"-s) given file or package.
     * This operation only supports on node platform
     */
    static load(name: string): any {

        // if name is not absolute or relative, then try to load package from the node_modules of the directory we are currenly in
        // this is useful when we are using typeorm package globally installed and it accesses drivers
        // that are not installed globally

        try {
            return require(name);

        } catch (err) {
            if (!path.isAbsolute(name) && name.substr(0, 2) !== "./" && name.substr(0, 3) !== "../") {
                return require(path.resolve(process.cwd() + "/node_modules/" + name));
            }

            throw err;
        }
    }

    /**
     * Normalizes given path. Does "path.normalize".
     */
    static pathNormalize(pathStr: string): string {
        return path.normalize(pathStr);
    }

    /**
     * Normalizes given path. Does "path.normalize".
     */
    static pathResolveAndNormalize(pathStr: string): string {
        return this.pathNormalize(this.pathResolve(pathStr));
    }

    /**
     * Gets file extension. Does "path.extname".
     */
    static pathExtname(pathStr: string): string {
        return path.extname(pathStr);
    }

    /**
     * Resolved given path. Does "path.resolve".
     */
    static pathResolve(pathStr: string): string {
        return path.resolve(pathStr);
    }

    /**
     * Test if path is absolute.
     */
    static isAbsolute(pathStr: string): boolean {
        return path.isAbsolute(pathStr);
    }

    /**
     * Synchronously checks if file exist. Does "fs.existsSync".
     */
    static fileExist(pathStr: string): boolean {
        return fs.existsSync(pathStr);
    }

    /**
     * Gets environment variable.
     */
    static getEnvVariable(name: string): any {
        return process.env[name];
    }


    static getHostPath():string {
        if (process.platform === 'win32') {
            return path.join(process.env.SYSTEMROOT, '/System32/drivers/etc/hosts');
        }
        return '/etc/hosts';
    }

    static getHostFileContent():string {
        return fs.readFileSync(this.getHostPath(),{encoding:'utf-8'})
    }

}