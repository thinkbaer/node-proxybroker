import * as _ from 'lodash';
import * as net from 'net';
import Exceptions from '@typexs/server/libs/server/Exceptions';
import {IHttpHeaders, Log} from '@typexs/base';
import {E_SOCKET_FINISHED} from '../Constants';


export class SocketHandle {

  private static inc = 1;

  readonly id: number;

  readonly start: Date;

  meta: any = {};

  stop: Date;

  duration: number;

  socket: net.Socket;

  finished = false;

  data: Buffer;

  error: Error = null;

  socketError = false;

  statusCode: number;

  sslDetect = false;

  query: Buffer;

  headersList: { key: string, orgKey: string, value: string }[] = [];

  headers: Buffer;

  body: Buffer;

  options: { ssl?: boolean, timeout?: number };

  constructor(socket: net.Socket, opts: { ssl?: boolean, timeout?: number, url?: string } = {}) {
    this.options = _.defaults(opts, {ssl: false, timeout: 10000});

    this.socket = socket;
    this.start = new Date();

    this.socket.setKeepAlive(true);
    this.socket.setTimeout(this.options.timeout);

    this.socket.on('data', this.onData.bind(this));
    this.socket.on('close', this.onClose.bind(this));
    this.socket.on('timeout', this.onTimeout.bind(this));
    this.socket.on('error', this.onError.bind(this));

    this.id = SocketHandle.inc++;
    this.socket['handle_id'] = this.id;
  }


  url() {
    const url = _.get(this.options, 'url', 'unknown');
    return (this.sslTarget ? 'https' : 'http') + '://' + url;
  }

  get sslTarget() {
    return _.get(this.options, 'ssl', false);
  }


  onData(data: Buffer) {
    if (!data) {
      return;
    }

    if (this.sslDetect || data[0] === 0x16 || data[0] === 0x80 || data[0] === 0x00) {
      this.sslDetect = true;
      return;
    }


    if (this.data) {
      this.data = Buffer.concat([this.data, data]);
      if (this.body) {
        this.body = Buffer.concat([this.body, data]);
      }
    } else {
      this.data = data;
      const headerEnd = data.indexOf('\r\n');
      const headersEnd = data.indexOf('\r\n\r\n');

      if (headerEnd < headersEnd && headersEnd > 0) {
        this.query = Buffer.allocUnsafe(headerEnd);
        this.headers = Buffer.allocUnsafe(headersEnd - headerEnd - 2);
        this.body = Buffer.allocUnsafe(data.length - headersEnd - 4);

        data.copy(this.query, 0, 0, headerEnd);
        data.copy(this.headers, 0, headerEnd + 2, headersEnd);
        data.copy(this.body, 0, headersEnd + 4);

        for (const _x of this.headers.toString().split('\r\n')) {
          const split = _x.split(':', 2);
          this.headersList.push({
            key: split[0].trim().toLocaleLowerCase(),
            orgKey: split[0].trim(),
            value: split[1].trim()
          });
        }

        if (this.query.length > 0) {
          const first = this.query.toString();
          const matches = first.match(/ (\d{3}) /);
          if (first && matches && matches.length > 0) {
            this.statusCode = parseInt(matches[1], 0);
            if (this.statusCode >= 400) {
              this.error = Exceptions.handle(new Error(first));
            }
          }
        } else {
          // Not data?
          this.debug('No data delivered');
        }
      }
    }
  }

  removeHeader(key: string) {
    key = key.toLocaleLowerCase();
    _.remove(this.headersList, {key: key});
  }

  setHeader(orgKey: string, value: string) {
    this.removeHeader(orgKey);
    const key = orgKey.toLocaleLowerCase();
    this.headersList.push({key: key, orgKey: orgKey, value: value});
  }

  getHeaders(): IHttpHeaders {
    const h = {};
    this.headersList.map(v => h[v.orgKey] = v.value);
    return h;
  }

  build(): Buffer {
    if (!this.query || this.sslDetect) {
      if (this.data) {
        return this.data;
      } else {
        return null;
      }
    }

    const buf = Buffer.allocUnsafe(2);
    buf.write('\r\n');

    const entries = [];
    for (const _x of this.headersList) {
      entries.push(_x.orgKey + ': ' + _x.value);
    }
    const strEntries = entries.join('\r\n');

    this.headers = Buffer.allocUnsafe(strEntries.length);
    this.headers.write(strEntries);

    const list: Buffer[] = [this.query, buf, this.headers, buf, buf, this.body];
    return Buffer.concat(list);
  }


  hasError() {
    return this.error !== null;
  }


  hasSocketError() {
    return this.socketError === true;
  }


  onError(err: Error) {
    this.debug('ERROR', err);
    this.socketError = true;
    this.error = Exceptions.handle(err);
    this.finish();
  }


  onTimeout() {

    if (!this.socket.destroyed) {
      this.socket.destroy(new Error('ESOCKETTIMEDOUT'));
    }
    this.finish();
    this.debug('timeout after ' + this.duration);
  }


  close() {
    if (this.finished) {
      return;
    }
    this.debug('close socket ' + this.socket.destroyed);
    this.socket.end();
  }


  onClose(had_error: boolean) {
    if (!this.duration) {
      this.stop = new Date();
      this.duration = this.stop.getTime() - this.start.getTime();
    }
    this.debug('socket close error=' + had_error + ' duration=' + this.duration);
    this.finish();
  }


  onFinish(): Promise<SocketHandle> {
    const self = this;
    return new Promise(resolve => {
      self.socket.once(E_SOCKET_FINISHED, () => {
        resolve(self);
      });
    });
  }


  finish() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.stop = new Date();
    this.duration = this.stop.getTime() - this.start.getTime();
    this.debug('server socket finished duration=' + this.duration);

    if (this.socket) {
      this.socket.unref();
      this.socket.removeListener('data', this.onData.bind(this));
      this.socket.removeListener('close', this.onClose.bind(this));
      this.socket.removeListener('timeout', this.onTimeout.bind(this));
      this.socket.removeListener('error', this.onError.bind(this));
      this.socket.emit(E_SOCKET_FINISHED);
    }
  }


  dump() {
    if (this.data) {
      return this.data.toString();
    }
    return '';
  }


  debug(...args: any[]) {
    if (args.length >= 1 && typeof args[0] === 'string') {
      args[0] = 'socketHandle.id=' + this.id + ' ' + args[0];
    } else {
      args.unshift('socketHandle.id=' + this.id);
    }

    Log.debug(...args);
  }
}
