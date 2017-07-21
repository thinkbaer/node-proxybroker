import * as _ from 'lodash'
import {IUrlBase} from "../lib/IUrlBase";
import {ProtocolType} from "../lib/ProtocolType";
import {EventBus} from "../events/EventBus";
import {SocketHandle} from "../server/SocketHandle";

export class ProxyUsedEvent {

    protocol: ProtocolType;

    hostname: string;

    port: number;

    duration: number = 0;

    success: boolean = false;

    error: Error = null

    fired: boolean = false

    start: Date;

    stop: Date;

    statusCode: number;


    constructor(options?: IUrlBase, handle?: SocketHandle) {
        if (options) {
            this.assignFrom(options)
        }

        if (handle) {
            this.assignFrom(handle)

        }

        // _.assign(this, options)
    }

    assignFrom(options: IUrlBase | SocketHandle){
        if(options instanceof SocketHandle){
            this.duration = options.duration

            this.start = options.start
            this.stop = options.stop
            this.statusCode = options.statusCode
            this.error = options.error
            this.success = !options.hasError()
        }else{
            this.protocol = options.protocol === 'https' ? ProtocolType.HTTPS : ProtocolType.HTTP
            this.hostname = options.hostname
            this.port = options.port
        }
    }

    fire() {
        this.fired = true;
        EventBus.post(this)
    }

}