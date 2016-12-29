/* Provider */


import {ProxyType} from "./proxy_types";



import {SpecNode} from "./op";
import {Visit} from "./op_visit";


export class Root extends SpecNode {

    base: any

    constructor(base: any) {
        super()
        this.base = base
    }

}
/*
 export class Context {

 node: SpecNode
 arguments: Array<any>
 results: Object

 constructor(node: SpecNode) {
 this.node = node
 this.arguments = node.defaultArgs();

 }


 execute(done: Function) {
 //        return new Promise()
 let args: Array<any> = []
 args.push((res: any, err: any) => {
 done(res, err)
 })

 this.node.execute.apply(this.node, args)
 }

 }
 */

/*
 class ProcessNode {

 rootNode : SpecNode
 stack: Array<Context>
 // parent : ProcessNode
 ctxt : Context


 constructor(node : SpecNode){
 this.rootNode = node
 this.stack.push(new Context(node))
 }


 run(){
 let self = this

 let p = Promise.resolve({})
 p = p.then(self.node.execute.bind(self.ctxt))

 if(self.node.children.length > 0){
 p = p.then((res)=>{
 let processNodes : Array<any> = []
 self.node.children.forEach((child) => {
 let pNode = new ProcessNode(child,self)
 pNode.ctxt.arguments.push(res)
 processNodes.push(pNode)
 })
 return processNodes
 }).map((x:ProcessNode)=>{
 return x.run()
 })
 }




 return p

 }
 }

 */

export class ProviderSpec {

    private name: string
    private type: ProxyType
    private op: SpecNode


    constructor(name: string, type: ProxyType) {
        this.name = name
        this.type = type
        this.op = new Root(this)
    }

    static create(name: string, type: ProxyType): ProviderSpec {
        let provider = new ProviderSpec(name, type);
        return provider;
    }

    /*
     static build(provider : ProviderSpec) : ProcessNode {
     return new ProcessNode(provider.op)




     }
     */
    visit(url: string): SpecNode {
        let visitNode = new Visit(url);
        return this.op.add(visitNode)
    }

}
