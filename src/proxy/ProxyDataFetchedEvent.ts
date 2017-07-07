import * as _ from 'lodash'
import {EventBus} from "../events/EventBus";

import {ProxyDataFetched} from "./ProxyDataFetched";

export class ProxyDataFetchedEvent extends ProxyDataFetched {

    fire():Promise<any> {
        return EventBus.post(this)
    }
}