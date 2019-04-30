// The MIT License (MIT)
//
// Copyright (c) 2012 Koichi Kobayashi
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as net from "net";
import * as http from "http";
import * as tls from "tls";
import * as _ from "lodash";
import {EventEmitter} from "events";
import {Agent} from "http";
import {TLSSocket} from "tls";


export class TunnelingAgent extends EventEmitter {

  options: any;

  proxyOptions: any;

  maxSockets: number;

  sockets: net.Socket[];

  requests: any[];

  request: Function;

  defaultPort: number;

  //emitter: EventEmitter;

  erroredResponse: any;

  constructor(options: any) {
    super();

    //this.emitter = new EventEmitter();

    //   let self = this;
    this.options = options || {};
    this.proxyOptions = this.options.proxy || {};
    this.maxSockets = this.options.maxSockets || _.get(http.Agent, 'defaultMaxSockets');
    this.requests = [];
    this.sockets = [];

    this.on('free', this.onFree.bind(this));

  }

  /*
    on(event: string | symbol, listener: (...args: any[]) => void) {
      this.emitter.on(event, listener);
      return this;
    }

    emit(event: string | symbol, ...args: any[]) {
      return this.emitter.emit(event, ...args);
    }
  */
  static toOptions(host: string, port: number, localAddress: string) {
    if (typeof host === 'string') { // since v0.10
      return {
        host: host,
        port: port,
        localAddress: localAddress
      };
    }
    return host; // for v0.11 or later
  }

  static mergeOptions(target: any, ...other: any[]) {
    for (let i = 1, len = arguments.length; i < len; ++i) {
      let overrides = arguments[i];
      if (typeof overrides === 'object') {
        let keys = Object.keys(overrides);
        for (let j = 0, keyLen = keys.length; j < keyLen; ++j) {
          let k = keys[j];
          if (overrides[k] !== undefined) {
            target[k] = overrides[k];
          }
        }
      }
    }
    return target;
  }

  onFree(socket: net.Socket, host: string, port: number, localAddress: string) {
    let options = TunnelingAgent.toOptions(host, port, localAddress);
    for (let i = 0, len = this.requests.length; i < len; ++i) {
      let pending = this.requests[i];
      if (pending.host === options.host && pending.port === options.port) {
        // Detect the request to connect same origin server,
        // reuse the connection.
        this.requests.splice(i, 1);
        pending.request.onSocket(socket);
        return;
      }
    }
    socket.destroy();
    this.removeSocket(socket);
  }

  addRequest(req: any, host: string, port: number, localAddress: string) {
    let self = this;
    let options = TunnelingAgent.mergeOptions({request: req}, self.options, TunnelingAgent.toOptions(host, port, localAddress));

    if (self.sockets.length >= this.maxSockets) {
      // We are over limit so we'll add it to the queue.
      self.requests.push(options);
      return;
    }

    // If we are under maxSockets create a new one.
    self.createSocket(options, function (socket: net.Socket) {
      socket.on('free', onFree);
      socket.on('close', onCloseOrRemove);
      socket.on('agentRemove', onCloseOrRemove);
      req.onSocket(socket);

      function onFree() {
        self.emit('free', socket, options);
      }

      function onCloseOrRemove(err: Error) {
        self.removeSocket(socket);
        socket.removeListener('free', onFree);
        socket.removeListener('close', onCloseOrRemove);
        socket.removeListener('agentRemove', onCloseOrRemove);
      }
    });
  };

  createSocket(options: any, cb: Function) {
    let self = this;
    let placeholder: any = {};
    self.sockets.push(placeholder);

    let connectOptions = TunnelingAgent.mergeOptions({}, self.proxyOptions, {
      method: 'CONNECT',
      path: options.host + ':' + options.port,
      agent: false,
      headers: {
        host: options.host + ':' + options.port
      }
    });
    if (options.localAddress) {
      connectOptions.localAddress = options.localAddress;
    }
    if (connectOptions.proxyAuth) {
      connectOptions.headers = connectOptions.headers || {};
      connectOptions.headers['Proxy-Authorization'] = 'Basic ' +
        new Buffer(connectOptions.proxyAuth).toString('base64');
    }

    let connectReq = this.request(connectOptions);
    connectReq.useChunkedEncodingByDefault = false; // for v0.6
    connectReq.once('response', onResponse); // for v0.6
    connectReq.once('upgrade', onUpgrade);   // for v0.6
    connectReq.once('connect', onConnect);   // for v0.7 or later
    connectReq.once('error', onError);
    connectReq.end();

    function onResponse(res: any) {
      // Very hacky. This is necessary to avoid http-parser leaks.
      res.upgrade = true;
    }

    function onUpgrade(res: any, socket: any, head: any) {
      // Hacky.
      process.nextTick(function () {
        onConnect(res, socket, head);
      });
    }

    function onConnect(res: any, socket: net.Socket, head: any) {
      connectReq.removeAllListeners();
      socket.removeAllListeners();

      if (res.statusCode !== 200) {
        socket.destroy();
        let error = new Error('tunneling socket could not be established, ' +
          'statusCode=' + res.statusCode);
        (<any>error).code = 'ECONNRESET';
        self.erroredResponse = res;
        options.request.emit('error', error);
        self.removeSocket(placeholder);
        return;
      }
      if (head.length > 0) {
        socket.destroy();
        let error = new Error('got illegal response body from proxy');
        (<any>error).code = 'ECONNRESET';
        self.erroredResponse = res;
        options.request.emit('error', error);
        self.removeSocket(placeholder);
        return;
      }
      self.sockets[self.sockets.indexOf(placeholder)] = socket;
      return cb(socket);
    }

    function onError(cause: Error) {
      connectReq.removeAllListeners();
      /*
      if(connectReq.connection instanceof TLSSocket){
        //connectReq.connection.removeAllListeners();
      }*/
      let error = new Error('tunneling socket could not be established, ' +
        'cause=' + cause.message);
      (<any>error).code = 'ECONNRESET';
      options.request.emit('error', error);
      self.removeSocket(placeholder);
    }
  };

  removeSocket(socket: net.Socket) {
    let pos = this.sockets.indexOf(socket)
    if (pos === -1) {
      return;
    }
    this.sockets.splice(pos, 1);

    let pending = this.requests.shift();
    if (pending) {
      // If we have pending requests and a socket gets closed a new one
      // needs to be created to take over in the pool for the one that closed.
      this.createSocket(pending, function (socket: net.Socket) {
        pending.request.onSocket(socket);
      });
    }
  };


}

