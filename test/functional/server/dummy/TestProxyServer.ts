import * as http from 'http';
import {ProxyServer} from '../../../../src/libs/server/ProxyServer';

export class TestProxyServer extends ProxyServer {

  constructor(root: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
    super();
    this.root = root.bind(this);
  }

}
