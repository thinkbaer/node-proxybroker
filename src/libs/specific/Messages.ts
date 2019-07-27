import {TodoException} from "@typexs/base";
import {InterpolationSupport} from "commons-config";

export const MESSAGE = {
  ORQ01: {k: 'ORQ01', _: 'Try connect to ${uri} over proxy ${proxy_uri} ...'},
  ORQ02: {k: 'ORQ02', _: 'Try connect to ${uri} ...'},
  ORQ03: {k: 'ORQ03', _: 'set TCP_NODELAY'},
  ORQ04: {k: 'ORQ04', _: 'HTTP-Tunneling enabled.'},

  RCL01: {k: 'RCL01', _: 'Received ${length} byte from sender.'},
  ERR01: {k: 'ERR01', _: 'Connection aborted through errors:'},
  ERR02: {k: 'ERR02', _: '- ${error}'},
  ERR03: {k: 'ERR03', _: 'Connection refused.'},
  ERR04: {k: 'ERR04', _: 'Connection timeout.'},
  ERR05: {k: 'ERR05', _: 'Connection aborted.'},
  CNE01: {k: 'CNE01', _: 'Connection not established.'},
  RCC01: {k: 'RCC01', _: 'Connection closed to ${uri} (${duration}ms)'},
  HED01: {k: 'HED01', _: '${header}'},
  OSC01: {k: 'OSC01', _: 'Connected to proxy ${uri}'},
  OSC02: {k: 'OSC02', _: 'Connected to ${addr}:${port}'},
  OSC03: {k: 'OSC03', _: 'Try handshake for secure connetion ...'},
  OSE01: {k: 'OSE01', _: 'Forced end of socket.'},
  OST01: {k: 'OST01', _: 'Socket timed out after ${duration}ms'},
  OTS01: {k: 'OTS01', _: 'Secured connection established (${duration}ms)'},

  JDG01: {k: 'JDG01', _: 'Judge connected from ${addr}:${port}. (${duration}ms)'},
  PRX01: {k: 'PRX01', _: 'Proxy is L1 - elite (high anonymus):'},
  PRX02: {k: 'PRX02', _: 'Proxy is L2 - anonymus:'},
  PRX03: {k: 'PRX03', _: 'Proxy is L3 - transparent:'},
  PRX10: {k: 'PRX10', _: 'Proxy level is unknown:'},
  LVL01: {k: 'LVL01', _: '- Detected proxy ip in via header: ${key} = ${value}'},
  LVL02: {k: 'LVL02', _: '- Detected local ip in forward header: ${key} = ${value}'},
  LVL03: {k: 'LVL03', _: '- Has via header: ${key} = ${value}'},
  LVL04: {k: 'LVL04', _: '- Has forward header: ${key} = ${value}'},

  JDG02: {
    k: 'JDG02', _:
      'Bootstrap judge service status:\n' +
      '- selftest active: ${selftest}\n' +
      '- the by remote accessible ip is ${ip}\n' +
      '- the service is runnable: ${runnable}'
  },

};


Object.keys(MESSAGE).forEach(_x => {
  if (_x != MESSAGE[_x].k) {
    throw new TodoException('Correct message key.')
  }
});

export class Messages {


  static get(msgId: string, parameter?: any) {
    let str = "";

    if (MESSAGE[msgId]) {

      if (parameter) {
        let msg = {msg: MESSAGE[msgId]._};
        InterpolationSupport.exec(msg, parameter);
        str = msg.msg;

      } else {
        str = MESSAGE[msgId]._
      }

    } else {
      throw new TodoException()
    }
    return str
  }
}
