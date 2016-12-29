import * as Promise from "bluebird";
import * as request from "request-promise";
import * as fs from "fs";


import {Executor, SpecNode} from "./op";

export class Visit extends SpecNode {

    url: string
    protocol: string

    constructor(url: string) {
        super()

        if(url.startsWith('/')){
            url = 'file://'+url
        }

        this.url = url
        let split = this.url.split('://',1)
        this.protocol = split.shift();

        if(this.protocol == null || ['http','https','file'].indexOf(this.protocol) == -1){
            throw new Error(this.protocol + ' for '+this.url + ' not supported')
        }
    }

    executor(parent : Executor = null): VisitExecutor {
        return new VisitExecutor(this, parent)
    }
}


export class VisitExecutor extends Executor {

    jar: any
    content: string
    node: Visit

    constructor(node: Visit, parent:Executor = null) {
        super(node,parent)
    }

    exec(done: Function) {
        switch (this.node.protocol){
            case 'http':
            case 'https':
                this.execHttp(done)
                break;
            case 'file':
                this.execFile(done)
                break;
            default:
                throw new Error('Wrong protocol ' + this.node.protocol)
        }
    }

    execHttp(done:Function){
        let self = this

        this.jar = request.jar()

        request.get(this.node.url, {jar: this.jar})
            .then(function (content) {
                self.content = content
                return self.execChildren()
            })
            .then(function () {
                done()
            })
            .catch(function (err) {
                done(err)
            })
    }

    execFile(done : Function){
        let self = this
        fs.readFile(this.node.url.replace('file://',''),'utf8', (err,data) => {
            self.content = data
            if(err){
                done(err)
            }else{
                return self.execChildren()
                    .then(function () {
                        done()
                    })
                    .catch(function (err) {
                        done(err)
                    })
            }

        })
    }

}
