/**
 * Created by cezaryrk on 15.10.16.
 */
"use strict";
const Promise = require("bluebird");
const fs = require("fs");
class PageHandle {
}
class Main {
    constructor() {
        this.providerClasses = [];
    }
    boot() {
        console.log('boot');
        let self = this;
        Promise.resolve({})
            .then(function () {
            return new Promise(function (res, rej) {
                fs.readdir(__dirname + '/providers', function (err, result) {
                    if (err) {
                        rej(err);
                    }
                    else {
                        let provider_entries = new Array();
                        for (let entry of result)
                            if (entry.match('\.js$')) {
                                provider_entries.push(entry);
                            }
                        res(provider_entries);
                    }
                });
            });
        })
            .map((filename) => {
            let _path = './providers/' + filename;
            console.log(_path);
            let _provider = require(_path);
            console.log(_path, _provider);
            var names = Object.keys(_provider);
            for (let name of names) {
                self.providerClasses.push(new _provider[name]());
            }
        })
            .then(() => {
            return self.providerClasses;
        })
            .map(function (providerInstance) {
            return providerInstance.fetch();
        })
            .catch(function (err) {
            console.error(err);
        });
    }
    // arg: find
    find() {
        console.log('find');
    }
}
let main = new Main();
main.boot();
// .find() 
