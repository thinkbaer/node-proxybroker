const HttpsProxyAgent = require('https-proxy-agent');
import * as  net from 'net';
import * as tls from 'tls';
import {ClientRequest} from 'http';

const debug = require('debug')('https-proxy-agent');

/**
 * Called when the node-core HTTP client library is creating a new HTTP request.
 *
 * @api public
 */

HttpsProxyAgent.prototype.callback = function connect(req: ClientRequest, opts: any, fn: Function) {
  const proxy: any = this.proxy;


  // create a socket connection to the proxy server

  let socket: net.Socket;

  if (this.secureProxy) {
    socket = tls.connect(proxy);
  } else {
    socket = net.connect(proxy);
  }

  // Hack to make abort possible
  req.once('abort', (err: Error) => {
    socket.setTimeout(0);
    socket.destroy();
    cleanup();
    fn(err);
  });


  // we need to buffer any HTTP traffic that happens with the proxy before we get
  // the CONNECT response, so that if the response is anything other than an "200"
  // response code, then we can re-play the "data" events on the socket once the
  // HTTP parser is hooked up...
  let buffers: any = [];
  let buffersLength = 0;

  function read() {
    const b = socket.read();
    if (b) {
      ondata(b);
    } else {
      socket.once('readable', read);
    }
  }

  function cleanup() {
    socket.removeListener('data', ondata);
    socket.removeListener('end', onend);
    socket.removeListener('error', onerror);
    socket.removeListener('close', onclose);
    socket.removeListener('readable', read);
  }

  function onclose(err: Error) {
    debug('onclose had error %o', err);
  }

  function onend() {
    debug('onend');
  }

  function onerror(err: Error) {
    cleanup();
    fn(err);
  }

  function ondata(b: Buffer) {
    buffers.push(b);
    buffersLength += b.length;
    let buffered = Buffer.concat(buffers, buffersLength);
    const str = buffered.toString('ascii');

    // tslint:disable-next-line:no-bitwise
    if (!~str.indexOf('\r\n\r\n')) {
      // keep buffering
      debug('have not received end of HTTP headers yet...');
      if (socket.read) {
        read();
      } else {
        socket.once('data', ondata);
      }
      return;
    }

    const firstLine = str.substring(0, str.indexOf('\r\n'));
    const statusCode = +firstLine.split(' ')[1];
    debug('got proxy server response: %o', firstLine);

    if (200 === statusCode) {
      // 200 Connected status code!
      let sock = socket;

      // nullify the buffered data since we won't be needing it
      buffers = buffered = null;

      if (opts.secureEndpoint) {
        // since the proxy is connecting to an SSL server, we have
        // to upgrade this socket connection to an SSL connection
        debug(
          'upgrading proxy-connected socket to TLS connection: %o',
          opts.host
        );
        opts.socket = socket;
        opts.servername = opts.servername || opts.host;
        opts.host = null;
        opts.hostname = null;
        opts.port = null;
        sock = tls.connect(opts);
      }

      cleanup();
      fn(null, sock);
    } else {
      // some other status code that's not 200... need to re-play the HTTP header
      // "data" events onto the socket once the HTTP machinery is attached so that
      // the user can parse and handle the error status code
      cleanup();

      // save a reference to the concat'd Buffer for the `onsocket` callback
      buffers = buffered;

      // need to wait for the "socket" event to re-play the "data" events
      req.once('socket', onsocket);
      fn(null, socket);
    }
  }

  // tslint:disable-next-line:no-shadowed-variable
  function onsocket(socket: any) {
    // replay the "buffers" Buffer onto the `socket`, since at this point
    // the HTTP module machinery has been hooked up for the user
    if ('function' === typeof socket.ondata) {
      // node <= v0.11.3, the `ondata` function is set on the socket
      socket.ondata(buffers, 0, buffers.length);
    } else if (socket.listeners('data').length > 0) {
      // node > v0.11.3, the "data" event is listened for directly
      socket.emit('data', buffers);
    } else {
      // never?
      throw new Error('should not happen...');
    }

    // nullify the cached Buffer instance
    buffers = null;
  }

  socket.on('error', onerror);
  socket.on('close', onclose);
  socket.on('end', onend);

  if (socket.read) {
    read();
  } else {
    socket.once('data', ondata);
  }

  const hostname = opts.host + ':' + opts.port;
  let msg = 'CONNECT ' + hostname + ' HTTP/1.1\r\n';

  let headers = Object.assign({}, proxy.headers);
  if (opts.proxyHeaders) {
    headers = Object.assign(headers, opts.proxyHeaders);
  }
  if (proxy.auth) {
    headers['Proxy-Authorization'] =
      'Basic ' + Buffer.from(proxy.auth).toString('base64');
  }

  // the Host header should only include the port
  // number when it is a non-standard port
  let host = opts.host;
  if (!isDefaultPort(opts.port, opts.secureEndpoint)) {
    host += ':' + opts.port;
  }
  headers['Host'] = host;

  headers['Connection'] = 'close';
  Object.keys(headers).forEach(function (name) {
    msg += name + ': ' + headers[name] + '\r\n';
  });

  socket.write(msg + '\r\n');
};


function isDefaultPort(port: number, secure: boolean) {
  return Boolean((!secure && port === 80) || (secure && port === 443));
}


