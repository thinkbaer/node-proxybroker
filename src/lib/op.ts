
import * as Promise from "bluebird";

export class SpecNode {

    parent: SpecNode
    children: Array<SpecNode>

    constructor() {
        this.parent = null
        this.children = new Array<SpecNode>()
    }

    add(node: SpecNode): SpecNode {
        this.children.push(node)
        node.parent = this
        return node
    }

    executor(parent : Executor = null): Executor {
        return null
    }

}


export class Executor {

    $parent : any
    node: SpecNode

    constructor(node: SpecNode, parent: Executor = null) {
        this.$parent = parent
        this.node = node
    }

    exec(done: Function) {
        let self = this
        Promise.resolve({})
            .then(function () {
                return self.execChildren()
            })
            .then(function () {
                done()
            })
            .catch(function (err) {
                done(err)
            })
    }


    execChildren() {
        let execs: Array<Executor> = []
        for (let i = 0; i < this.node.children.length; i++) {
            let exec = this.node.children[i].executor(this)
            if (exec) {
                execs.push(exec)
            }
        }
        return Promise.resolve(execs)
            .map(function (_e: Executor) {
                return new Promise(function (res, rej) {
                    _e.exec((err: Error, res: any)=> {
                        if (err) {
                            rej(err)
                        } else {
                            res(res)
                        }
                    })
                })
            })
    }
}
