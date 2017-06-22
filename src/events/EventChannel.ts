import {CryptUtils} from "../utils/CryptUtils";
import {EventEmitter} from "events";

export class EventChannel extends EventEmitter {

    private inc: number = 0
    private name: string

    private subsciber: { object: any, method: string }[] = []


    constructor(name: string) {
        super()
        this.name = name;
        this.on(name, this.process.bind(this))
    }


    get size() {
        return this.subsciber.length
    }

    private  create(o: { object: any, method: string }, obj: any): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                let res = await o.object[o.method](obj)
                resolve(res)
            } catch (err) {
                reject(err)
            }
        })
    }


    private process(uuid: string, obj: any) {
        let self = this
        let prms: Promise<any>[] = []
        this.subsciber.forEach(function (entry) {
            prms.push(self.create(entry, obj))
        })

        Promise.all(prms).then((res) => {
            self.emit(self.id(uuid), null, res)
        })
    }


    private id(uuid: string) {
        return this.name + '-' + uuid
    }

    register(subscriber: any, method: string): void {
        if (!subscriber[method]) {
            throw new Error('method doesn\'t exists in subscriber object')
        }
        this.subsciber.push({
            object: subscriber, method: method
        })
    }

    post(o: any): Promise<any> {
        let uuid = CryptUtils.shorthash(this.name + '' + (this.inc++))
        let self = this
        return new Promise((resolve, reject) => {
            self.once(self.id(uuid), function (err: Error, res: any) {
                if (err) {
                    reject(err)
                } else {
                    resolve(res)
                }
            })
            self.emit(self.name, uuid, o)
        })

    }
}
