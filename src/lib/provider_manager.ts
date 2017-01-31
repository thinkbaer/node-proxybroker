//import {ProviderSpec} from "./provider_spec";
import * as fs from "fs";


export class ProviderManager {

    paths: Array<string>

  //  providers: Array<ProviderSpec>

    constructor() {
        this.paths = new Array<string>()
    }

    addPathAsync(path: string): Promise<boolean> {
        let self = this
        return new Promise(function(resolve, reject){
            fs.exists(path,exists => {
                if (exists) {
                    self.paths.push(path)
                }
                resolve(exists)
            })
        })

    }

    /* find provider classes */
    discover(done: Function) {

/*
        Promise.resolve({})
            .then(function () {
                return new Promise(function (res: any, rej: any) {
                    fs.readdir(__dirname + '/providers', function (err: Error, result: any) {
                        if (err) {
                            rej(err)
                        } else {
                            let provider_entries = new Array();
                            for (let entry of result)
                                if (entry.match('\.js$')) {
                                    provider_entries.push(entry)
                                }
                            res(provider_entries)
                        }
                    })
                })

            })
            .map((filename: string) => {
                let _path = './providers/' + filename
                console.log(_path)
                let _provider = require(_path);
                // self.providerClasses.push(new _provider());
            })

            .catch(function (err) {
                console.error(err)
            })
*/
    }

/*
    add(provider: ProviderSpec) {

    }
*/
}