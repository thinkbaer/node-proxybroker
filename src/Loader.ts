import * as _ from "lodash";
import {Config, IOptions} from "commons-config";
import {PlatformUtils} from "./utils/PlatformUtils";
import {Log} from "./lib/logging/Log";
import {ProxyFilter} from "./proxy/ProxyFilter";
import {ProxyValidator} from "./proxy/ProxyValidator";
import {ProviderManager} from "./provider/ProviderManager";
import {ProxyServer} from "./server/ProxyServer";
import {AppServer, IExpressOptions, K_APPSERVER} from "./server/AppServer";
import {ProxyRotator} from "./proxy/ProxyRotator";

import {IStorageOptions, K_STORAGE} from "./storage/IStorageOptions";
import {Storage} from "./storage/Storage";
import {EventBus} from "./events/EventBus";
import {IProxyRotatorOptions, K_ROTATOR} from "./proxy/IProxyRotatorOptions";
import {IProxyValidatiorOptions, K_VALIDATOR} from "./proxy/IProxyValidatiorOptions";
import {DEFAULT_PROXY_SERVER_OPTIONS, IProxyServerOptions, K_PROXYSERVER} from "./server/IProxyServerOptions";
import {IProviderOptions, K_PROVIDER} from "./provider/IProviderOptions";
import {ILoggerOptions, K_LOGGING} from "./lib/logging/ILoggerOptions";

import {Statistics} from "./storage/Statistics";
import {Container} from "typedi";

const DEFAULT_CONFIG_LOAD_ORDER = [
    {type: 'file', file: '${argv.configfile}'},
    {type: 'file', file: '${env.configfile}'},
    {type: 'file', file: '${os.homedir}/.proxybroker/config.json'},
    {type: 'file', file: './proxybroker.json'}
]


export class Loader {

    private static $self: Loader = null

    private CONFIG_LOADED: boolean = false

    private cfgOptions: IOptions = null

    private VERBOSE_DONE: boolean = false

    private start: Date = new Date()

    private storage: Storage;

    private proxyFilter: ProxyFilter;

    private proxyRotator: ProxyRotator;

    private proxyValidator: ProxyValidator;

    private providerManager: ProviderManager;

    private proxy_server: ProxyServer;

    private server: AppServer;


    async boot() {
        let o_logging: ILoggerOptions = Config.get(K_LOGGING, {})
        Log.options(o_logging);

        let o_storage: IStorageOptions = Config.get(K_STORAGE, {})
        this.storage = new Storage(o_storage);
        await this.storage.prepare()
        Container.set(Storage, this.storage)

        this.proxyFilter = new ProxyFilter(this.storage)
        EventBus.register(this.proxyFilter)

        let o_rotator: IProxyRotatorOptions = Config.get(K_ROTATOR, {})
        this.proxyRotator = new ProxyRotator(o_rotator, this.storage)
        EventBus.register(this.proxyRotator)

        let o_validator: IProxyValidatiorOptions = Config.get(K_VALIDATOR, {})
        this.proxyValidator = new ProxyValidator(o_validator, this.storage)
        EventBus.register(this.proxyValidator)
        await this.proxyValidator.prepare()

        let o_provider: IProviderOptions = Config.get(K_PROVIDER, {})
        this.providerManager = new ProviderManager(o_provider, this.storage)
        EventBus.register(this.providerManager)
        await this.providerManager.prepare()
        Container.set(ProviderManager, this.providerManager)

        let o_proxyserver: IProxyServerOptions = Config.get(K_PROXYSERVER, DEFAULT_PROXY_SERVER_OPTIONS)
        if (o_proxyserver.enable) {
            o_proxyserver.toProxy = true
            o_proxyserver.target = this.proxyRotator.next.bind(this.proxyRotator);
            this.proxy_server = new ProxyServer(o_proxyserver);
            await this.proxy_server.start()
            Log.info('start proxy server on ' + this.proxy_server.url());
        }



        let o_appserver: IExpressOptions = Config.get(K_APPSERVER, {});
        this.server = new AppServer(o_appserver);
        await this.server.prepare();
        await this.server.start()
        Log.info('start app server on ' + this.server.url());

        process.on('unhandledRejection', this.throwedUnhandledRejection.bind(this))
        process.on('uncaughtException', this.throwedUncaughtException.bind(this))
        process.on('warning', Log.warn.bind(Log))
        // Support exit throw Ctrl+C
        // process.on('exit', this.shutdown.bind(this))
        // process.on('SIGINT', this.shutdown.bind(this))
    }

    async status(): Promise<any> {

        let infos = {
            start: this.start.toLocaleString(),
            start_timestamp: this.start.getTime(),
            duration: Date.now() - this.start.getTime(),
        }

        let manager_status = await this.providerManager.status()
        let validator_status = await  this.proxyValidator.status()

        return {...infos,provider:manager_status,validator: validator_status}
    }

    async stats(): Promise<any> {
        let s = new Statistics(this.storage)
        return await s.stats()
    }


    async shutdown() {
        Log.info("Shutdown ...")
        try {
            await this.proxy_server.stop()
            await this.server.stop()
            await this.providerManager.shutdown();
            await this.proxyValidator.shutdown();
            await this.storage.shutdown();
        } catch (err) {
            Log.error('Shutdown error', err)
        }
    }

    throwedUnhandledRejection(reason: any, err: Error) {
        Log.error('unhandledRejection', reason, err)
    }

    throwedUncaughtException(err: Error) {
        Log.error('uncaughtException', err)
    }

    static _(): Loader {
        if (!this.$self) {
            this.$self = new Loader()
        }
        return this.$self
        //Log.enable = StdConsole.$enabled = argv.verbose;
    }

    static verbose(c: any) {
        if (this._().VERBOSE_DONE) return
        this._().VERBOSE_DONE = true
        if (c === true) {
            Log.options({
                enable: true,
                level: 'debug',
                transports: [
                    {
                        console: {
                            name: 'stderr',
                            defaultFormatter: true,
                            stderrLevels: ['info', 'debug', 'error', 'warn']
                        }
                    }
                ]
            }, true)

        }
    }

    config(c: any) {

        if (this.CONFIG_LOADED) return
        this.CONFIG_LOADED = true

        // check if it is an file
        try {
            if (c === false) {
                this.cfgOptions = Config.options({configs: DEFAULT_CONFIG_LOAD_ORDER});
            } else if (_.isString(c)) {
                // can be file or JSON with config
                try {
                    c = JSON.parse(c);
                } catch (e) {
                }

                if (_.isObject(c)) {
                    this.cfgOptions = Config.options({configs: DEFAULT_CONFIG_LOAD_ORDER});
                    Config.jar().merge(c)
                } else {
                    let configfile: string = null;

                    if (PlatformUtils.isAbsolute(c)) {
                        configfile = PlatformUtils.pathNormalize(c);
                    } else {
                        configfile = PlatformUtils.pathResolveAndNormalize(c);
                    }

                    let cfg = _.clone(DEFAULT_CONFIG_LOAD_ORDER);
                    if (PlatformUtils.fileExist(configfile)) {
                        cfg.push({type: 'file', file: configfile});
                    } else {
                        // INFO that file couldn't be loaded, because it doesn't exist
                    }
                    this.cfgOptions = Config.options({configs: cfg});

                    this.cfgOptions.configs.forEach(_c => {
                        if (_c.state && _c.type != 'system') {
                            console.log('Loading configuration from ' + _c.file);
                        }

                    })
                }
            }
        } catch (err) {
            console.error(err)
            process.exit(1)
        }


    }

    static configStatic(c: any) {
        this._().config(c)
    }


}
