import * as fs from 'fs';
import * as path from 'path'
import {IStorageOptions} from "../storage/IStorageOptions";
import {IConfigOptions} from "./IConfigOptions";
import {mergeDeep} from "typescript-object-utils";
import {ClassMetadataArgs} from "./ClassMetadataArgs";


const DEFAULT_CONFIG : IConfigOptions = {}


export class Config {

    private static $instance: Config = null

    /**
     * Flag for executed initialization
     * @type {boolean}
     */
    private _initialized: boolean = false

    files:string[] = new Array<string>();

    cmd_argv: { [key:string]: string } = {}

    options: IConfigOptions = DEFAULT_CONFIG

    private _metadata : {classes:Array<ClassMetadataArgs>} = {
        classes:[]
    }

    constructor() {
        this.options.workdir = process.cwd()
        this.options.appdir = this.options.workdir
        this.options.userdir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

        let k,v = null,inc = 0
        for(let i = 0; i < process.argv.length; i++){
            if(/^--/.test(process.argv[i])){
                k = process.argv[i].substr(2)
            }else{
                if(k){
                    this.cmd_argv[k] = process.argv[i]
                }else{
                    let _d = (inc++)+''
                    this.cmd_argv['_'+('0'.repeat(3 - _d.length))+_d] = process.argv[i]
                }
                k = null
            }
        }
    }


    static get() : Config {
        if(!Config.$instance){
            Config.$instance = new Config()
        }
        return Config.$instance
    }



    async init(options: IConfigOptions = DEFAULT_CONFIG): Promise<Config> {
        if (this._initialized) return Promise.resolve(this)
        this._initialized = true

        let self = this
        let $p = Promise.resolve(null)
            .then(() => {
                self.mergeOptions(options);
                if(self.cmd_argv['configfile']){
                    return self.loadFromFile(self.cmd_argv['configfile'])
                }
            })
            .then(() => {
                return self
            })
        return $p;
    }


    private mergeOptions(options:Object){
        this.options = mergeDeep(this.options, options)
    }

    /**
     * Load the configuration from a file with JSON content
     *
     * @param file
     */
    loadFromFile(file: string): Promise<boolean> {

        // TODO check if the path is relativ or absolute; on relative variant correct the path
        let _file = file
        let self = this

        return new Promise(function(resolve, reject){
            if(fs.existsSync(_file)){
                fs.stat(_file, function(err, stats){
                    if(err){
                        reject(err)
                    }else{
                        if(stats.isFile()){
                            fs.readFile(_file, function (err, data) {
                                if(err){
                                    reject(err)
                                }else{
                                    self.files.push(_file)
                                    self.mergeOptions(JSON.parse(data.toString()))
                                    resolve(true)
                                }
                            })
                        }else{
                            // TODO throw error because is not a file
                            resolve(false)
                        }
                    }
                })
            }else{
                // TODO throw error because file no exists
                resolve(false)
            }
        })
    }



    get metadata()
    {
        return this._metadata
    }

}