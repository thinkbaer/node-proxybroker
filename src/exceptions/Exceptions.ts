

import {NestedException} from "./NestedException";
export default class Exceptions {

    static EADDRINUSE = 'ADDRINUSE';

    static handle(err: Error):NestedException{
        if(err instanceof NestedException){
            return err
        }
        let msg = err.message.trim();

        let classification = 'UNCLASSIFIED';
        if(/ESOCKETTIMEDOUT/.test(msg)){
            classification = 'SOCKET_TIMEDOUT'
        }else if(/ETIMEDOUT/.test(msg)){
            classification = 'TIMEDOUT'
        }else if(/ECONNECTTIMEDOUT/.test(msg)){
            classification = 'CONNECT_TIMEOUT'
        }else if(/ECONNREFUSED/.test(msg)){
            classification = 'CONN_REFUSED'
        }else if(/socket hang up/.test(msg)){
            classification = 'SOCKET_HANGUP'
        }else if(/ECONNRESET/.test(msg)){
            classification = 'CONN_RESET'
        }else if(/EADDRINUSE/.test(msg)){
            classification = Exceptions.EADDRINUSE
        }else if(/EHOSTUNREACH/.test(msg)){
            classification = 'HOST_UNREACHABLE'
        }else if(/EPROTO.*SSL.*GET_SERVER_HELLO/.test(msg)){
            classification = 'SSL_UNSUPPORTED'
        }else if(/getaddrinfo\sENOTFOUND/.test(msg)){
            classification = 'ADDR_NOT_FOUND'
        }else if(/^(HTTP\/\d.\d)\s(\d{3})\s(.+)$/.test(msg)){
            let match = msg.match(/^(HTTP\/\d.\d)\s(\d{3})\s(.+)$/);
            classification = 'HTTP_ERROR_'+match[2];
            err.message = match[3]
        }
        return new NestedException(err,classification);

    }

    static newSocketTimeout(){
        return Exceptions.handle(new Error('ESOCKETTIMEDOUT'))
    }

    static newConnectTimeout(timeout: number = 0, duration:number = 0){
        return Exceptions.handle(new Error('ECONNECTTIMEDOUT set='+timeout+' durataion='+duration))
    }
}