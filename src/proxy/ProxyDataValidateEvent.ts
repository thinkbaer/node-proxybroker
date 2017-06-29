

import {EventBus} from "../events/EventBus";
import {ProxyData} from "./ProxyData";
import {IpAddr} from "../storage/entity/IpAddr";
export class ProxyDataValidateEvent {

    data: ProxyData

    isNew: boolean = true

    record: IpAddr = null

    fired: boolean = false


    constructor(data: ProxyData){
        this.isNew = false
        this.data = data
    }

    fire() {
        this.fired = true
        if(!this.record){
            this.isNew = true
        }

        EventBus.post(this)
    }
}