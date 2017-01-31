import {API} from "../module";
import DB from "../db/db";
import * as events from 'events';
import {ProxyDBO, DBObject} from "../db/schema";
import * as request from "request-promise-native";


export class ProxyHandle {

    $r: Registry
    $p: Promise<any>
    key: string
    ip: string
    port: number
    object: ProxyDBO
    locked: boolean = true
    isNew: boolean = true
    isRunning:boolean = false


    constructor($r: Registry, ip: string, port: number) {
        this.$r = $r
        this.key = [ip, port].join(':')
        this.ip = ip
        this.port = port

        this.load()
    }


    private async load(): Promise<ProxyHandle> {
        let self = this
        this.lock()
        let proxy = new ProxyDBO()
        return this.$r.backend.findOne(proxy, {ip4: this.ip, port: this.port})
            .then((res: ProxyDBO)=> {
                if (!res) {
                    res = new ProxyDBO()
                    res.ip4 = self.ip
                    res.port = self.port
                } else {
                    self.isNew = false
                }
                self.object = res
                self.unlock()
                return self
            })

    }

    private lock() {
        this.locked = true
        this.$r.emit('locked ' + this.key)
    }

    private unlock() {
        this.locked = false
        this.$r.emit('unlocked ' + this.key)
    }


    ready(): Promise<ProxyHandle> {
        let _self = this

        let f = function (self: ProxyHandle, resolve: Function, reject: Function) {
            try {
                if (self.locked) {
                    self.$r.once('unlocked ' + self.key, function () {
                        try {
                            if (self.locked) {
                                f(self, resolve, reject)
                            } else {
                                resolve(self)
                            }
                        } catch (e) {
                            reject(e)
                        }
                    })
                } else {
                    resolve(self)
                }
            } catch (e) {
                reject(e)
            }
        }

        return new Promise(function (res: Function, rej: Function) {
            f(_self, res, rej)
        })

    }

    async save(): Promise<ProxyHandle> {
        let self = this
        return this.ready()
            .then(()=> {
                self.lock()
                return self.$r.backend.save(this.object)
            })
            .then((p: ProxyDBO)=> {
                self.object = p
                self.unlock()
                return self
            })
    }

    test() : Promise<ProxyHandle>{
        var r = request.defaults({'proxy':'http://localproxy.com'})
        // http
        //return request.get('http://www.wikipedia.org', {proxy:})
        return null
    }

    /*
    run() : Promise<ProxyHandle> {
        if()

    }
    */

}


export class Registry extends events.EventEmitter implements API {

    backend: DB
    queue: Array<{ip: string,port: number}> = new Array()
    objects: {[key: string]: ProxyHandle} = {}
    concurrency: number = 10
    worker: number = 0
    // locked:
    // Promise: Promise<any> = Promise.resolve()

    _on: {[event: string]: Array<Function>} = {}

    constructor(db: DB) {
        super()
        this.backend = db
        this.on('enqueue', this.doEnqueue.bind(this))
        this.on('do work', this.doWork.bind(this))

    }

    lookupProxy(ip: string, port: number): Promise<ProxyHandle> {
        let id = [ip, port].join(':')
        if (!this.objects.hasOwnProperty(id)) {
            this.objects[id] = new ProxyHandle(this, ip, port)
        }
        return this.objects[id].ready()
    }

    private doEnqueue(data: {ip: string,port: number}) {
        this.queue.push(data)
        this.emit('do work')
    }


    private doWork() {
        if (this.worker < this.concurrency && this.queue.length > 0) {
            this.worker++
            let self = this

            let entry = this.queue.shift()

            this.lookupProxy(entry.ip, entry.port)
                .then((handle: ProxyHandle) => {
                    console.log('doing work with', entry)
                })
                .then(() => {
                    self.worker--
                    self.emit('do work')
                })
                .catch((err:Error)=>{
                    console.log(err)
                    self.worker--
                    self.emit('do work')
                })

            // Do work


        } else if (this.queue.length == 0 && this.worker == 0) {
            this.emit('waiting')
        } else {
            // console.log('pending')
        }

    }


    enqueue(ip: string, port: string|number, flags: number = 0): string {
        ip = ip.trim()
        if (!ip.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
            throw new Error('Wrong format of IP "' + ip + '"')
        }

        if (typeof port !== 'number') {
            port = parseInt(port)
        }

        if (1 > port || port > 65535) {
            throw new Error('port ot of range ' + port)
        }
        let id = [ip, port].join(':')

        this.emit('enqueue', {ip: ip, port: port})

        return [ip, port].join(':')
    }


}