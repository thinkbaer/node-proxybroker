import * as _ from "lodash";
import * as path from "path";
import {Config, IOptions} from "commons-config";
import {PlatformUtils} from "./utils/PlatformUtils";
import {Log} from "./lib/logging/Log";
import StdConsole from "./lib/logging/StdConsole";

const DEFAULT_CONFIG_LOAD_ORDER = [
    {type: 'system'},
    {type: 'file', file: '${argv.configfile}'},
    {type: 'file', file: '${env.configfile}'},
    {type: 'file', file: '${os.homedir}/.proxybroker/config.json'},
    {type: 'file', file: './proxybroker.json'}
]


export class Loader {

    private static $self: Loader = null

    private CONFIG_LOADED: boolean = false

    private cfgOptions: IOptions = null

    private VERBOSE_DONE:boolean = false


    static _(): Loader {
        if (!this.$self) {
            this.$self = new Loader()
        }
        return this.$self
        //Log.enable = StdConsole.$enabled = argv.verbose;
    }

    static verbose(c: any) {
        if (this._().VERBOSE_DONE)  return
        this._().VERBOSE_DONE = true
        if(c === true){
            Log.options({
                enable: true,
                level: 'debug',
                transports: [
                    {console: {name:'stderr',defaultFormatter: true, stderrLevels: ['info', 'debug', 'error', 'warn']}}
                ]
            }, true)

        }
    }

    config(c: any) {
        if (this.CONFIG_LOADED)  return
        this.CONFIG_LOADED = true

        // check if it is an file
        if (c === false) {
            this.cfgOptions = Config.options({configs: DEFAULT_CONFIG_LOAD_ORDER});
        } else if (_.isString(c)) {
            // can be file or JSON with config
            try {
                c = JSON.parse(c)
            } catch (e) {
            }

            if (_.isObject(c)) {
                this.cfgOptions = Config.options({configs: DEFAULT_CONFIG_LOAD_ORDER});
                Config.jar().merge(c)
            } else {
                let configfile: string = null
                if (PlatformUtils.isAbsolute(c)) {
                    configfile = PlatformUtils.pathNormalize(c)
                } else {
                    configfile = PlatformUtils.pathResolveAndNormalize(c)
                }

                let cfg = DEFAULT_CONFIG_LOAD_ORDER
                if (PlatformUtils.fileExist(configfile)) {
                    cfg.push({type: 'file', file: configfile})
                }else{
                    // INFO that file couldn't be loaded, because it doesn't exist
                }
                this.cfgOptions = Config.options({configs: cfg});

            }

        }
    }

    static configStatic(c: any) {
        this._().config(c)
    }


}
