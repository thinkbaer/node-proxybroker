import * as _ from 'lodash'
import {SubscriberInfo} from "./SubscriberInfo";

interface EventListenerDef {
    namespace: string
    method: string
    eventClazz: Function
    holderClazz: Function
}


export default class EventBusMeta {

    private static self: EventBusMeta;

    private $types: EventListenerDef[] = [];

    static $() {
        if (!this.self) {
            this.self = new EventBusMeta()
        }
        return this.self
    }


    public getNamespacesForEvent(o: any): string[] {
        let ns: string[] = [];
        for (let i = 0; i < this.$types.length; i++) {
            let $t = this.$types[i];
            if (o instanceof $t.eventClazz) {
                ns.push($t.namespace)
            }
        }
        return _.uniq(ns)
    }

    public getSubscriberInfo(o: Function): SubscriberInfo[] {
        let list: SubscriberInfo[] = [];
        for (let i = 0; i < this.$types.length; i++) {
            let $t = this.$types[i];
            if (o instanceof $t.holderClazz.constructor) {
                list.push({
                    namespace: $t.namespace,
                    method: $t.method
                })
            }
        }
        return list
    }


    public register(clazz: Function, method: string, descriptor: PropertyDescriptor, args: any[]) {
        let self = this;
        args.forEach(_eventClass => {
            let def: EventListenerDef = {
                namespace: _eventClass.name,
                eventClazz: _eventClass,
                method: method,
                holderClazz: clazz
            };
            self.$types.push(def)
        })
    }


}