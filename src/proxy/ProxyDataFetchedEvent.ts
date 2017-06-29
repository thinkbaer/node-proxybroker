import * as _ from 'lodash'
import {EventBus} from "../events/EventBus";

import {IProxyData} from "./IProxyData";
import TodoException from "../exceptions/Todo";

export class ProxyDataFetchedEvent {

    list: IProxyData[] = []


    constructor(list: IProxyData | IProxyData[]){
        if(_.isArray(list)){
            this.list = list
        }else if(list.ip && list.port){
            this.list.push(list)
        }else{
            throw new TodoException()
        }
    }

    fire() {
        EventBus.post(this)
    }
}