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

import * as http from "http";
import * as https from "https";
import {TunnelingAgent} from "./TunnelingAgent";
import * as net from "net";
import * as tls from "tls";
import {Agent} from "http";

export function httpOverHttp(options: any) {
  let agent = new TunnelingAgent(options);
  agent.request = http.request;
  return <Agent><any>agent;
}

export function httpsOverHttp(options: any) {
  let agent = new TunnelingAgent(options);
  agent.request = http.request;
  agent.createSocket = createSecureSocket;
  agent.defaultPort = 443;
  return <Agent><any>agent;
}

export function httpOverHttps(options: any) {
  let agent = new TunnelingAgent(options);
  agent.request = https.request;
  return <Agent><any>agent;
}

export function httpsOverHttps(options: any) {
  let agent = new TunnelingAgent(options);
  agent.request = https.request;
  agent.createSocket = createSecureSocket;
  agent.defaultPort = 443;
  return <Agent><any>agent;
}

function createSecureSocket(options: any, cb: Function) {
  let self = this;
  TunnelingAgent.prototype.createSocket.call(self, options, function (socket: net.Socket) {
    let hostHeader = options.request.getHeader('host');
    let tlsOptions = TunnelingAgent.mergeOptions({}, self.options, {
      socket: socket,
      servername: hostHeader ? hostHeader.replace(/:.*$/, '') : options.host
    });

    // 0 is dummy port for v0.6
    let secureSocket = tls.connect(0, tlsOptions);
    self.sockets[self.sockets.indexOf(socket)] = secureSocket;
    cb(secureSocket);
  });
}
