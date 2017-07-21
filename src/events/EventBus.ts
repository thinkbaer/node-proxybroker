import * as _ from 'lodash'

import EventBusMeta from "./EventBusMeta";

import {EventChannel} from "./EventChannel";

/**
 * TODO spin-off this as eventbus-typescript
 */

export class EventBus {

    private static self: EventBus = null;

    private inc:number = 0;

    private channels: { [k: string]: EventChannel } = {};


    static $() {
        if (!this.self) {
            this.self = new EventBus()
        }
        return this.self
    }

    static get namespaces(){
        return Object.keys(this.$().channels)
    }

    private getOrCreateChannel(name: string) {
        if (!this.channels[name]) {
            this.channels[name] = new EventChannel(name)
        }
        return this.channels[name]
    }

    static register(o: any): void {
        // support multiple subsriber in one class
        let infos = EventBusMeta.$().getSubscriberInfo(o);
        if (_.isEmpty(infos)){
            throw new Error('registration went wrong')
        }

        let self = this;
        infos.forEach(info => {
            let channel = self.$().getOrCreateChannel(info.namespace);
            channel.register(o, info.method)
        })
    }

    static unregister(o: any): void {
        let infos = EventBusMeta.$().getSubscriberInfo(o);
        if (_.isEmpty(infos)){
            throw new Error('registration went wrong')
        }
        let self = this;
        infos.forEach(info => {
            let channel = self.$().getOrCreateChannel(info.namespace);
            channel.unregister(o);
            if(channel.size == 0){
                channel = self.$().channels[info.namespace];
                channel.removeAllListeners();
                delete self.$().channels[info.namespace]
            }
        })

    }


    private static postOnChannel(namespace: string, o: any): Promise<any> {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let channel = self.$().getOrCreateChannel(namespace);
            try {
                let res = await channel.post(o);
                resolve(res)
            } catch (e) {
                reject(e)
            }
        })
    }


    static post(o: any): Promise<any> {
        // TODO check is supported type?
        let self = this;
        let info = EventBusMeta.$().getNamespacesForEvent(o);
        if(info.length){
            self.$().inc++
        }
        let promises: Promise<any>[] = [];
        info.forEach(_namespace => {
            promises.push(self.postOnChannel(_namespace,o))
        });

        return Promise.all(promises)
    }
}