
import DB from "../db/db";


export interface Config {
    _loaded?: boolean
    env?: string
    work_dir?: string
    db_source: string
    server_ip?: string
    server_port?: number
}

export default class ProxyBroker {

    private static _instance: ProxyBroker = new ProxyBroker()

    private DB : DB = null;

    private $config: Config = {
        _loaded: false,
        env: null,
        work_dir: null,
        db_source: ':memory:',
        server_ip: '127.0.0.1',
        server_port: 8888
    }

    constructor() {
        if (ProxyBroker._instance) {
            throw new Error("Error: Instantiation failed: Use ProxyBroker.getInstance() instead of new.");
        }
        ProxyBroker._instance = this;
    }

    public static getInstance(): ProxyBroker {
        return ProxyBroker._instance;
    }


    public config(opts: Config): Promise<ProxyBroker> {
        let self = this
        return Promise.resolve().then(() => {
            if (!self.$config._loaded) {
                self.$config = Object.assign(self.$config, opts);
                self.$config._loaded = true
            }
            return self
        })
    }


    public bootstrap(): Promise<ProxyBroker> {
        let self = this
        return Promise.resolve()
            .then(() => {
                self.DB = new DB(self.$config)
                return self.DB.bootstrap()
            })
            .then(() => {return self})
    }


    public addProxy(opts: any) {
        // TODO check if exists
    }
}


