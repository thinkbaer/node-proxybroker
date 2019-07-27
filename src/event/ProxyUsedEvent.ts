import {Event} from 'commons-eventbus/decorator/Event';
import {IUrlBase} from '@typexs/base/libs/IUrlBase';
import {ProtocolType} from '../libs/specific/ProtocolType';
import {SocketHandle} from '../libs/server/SocketHandle';

@Event()
export class ProxyUsedEvent {

  protocol: ProtocolType;

  protocol_dest: ProtocolType;

  hostname: string;

  port: number;

  duration = 0;

  success = false;

  error: Error = null;

  fired = false;

  start: Date;

  stop: Date;

  statusCode: number;


  constructor(options?: IUrlBase, handle?: SocketHandle) {
    if (options) {
      this.assignFrom(options);
    }

    if (handle) {
      this.assignFrom(handle);
    }
  }

  assignFrom(options: IUrlBase | SocketHandle) {
    if (options instanceof SocketHandle) {
      this.duration = options.duration;
      this.start = options.start;
      this.stop = options.stop;
      this.statusCode = options.statusCode;
      this.error = options.error;
      this.success = !options.hasError();
      this.protocol_dest = options.ssl ? ProtocolType.HTTPS : ProtocolType.HTTP;
    } else {
      this.protocol = options.protocol === 'https' ? ProtocolType.HTTPS : ProtocolType.HTTP;
      this.hostname = options.hostname;
      this.port = options.port;
    }
  }

}
