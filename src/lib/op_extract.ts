import * as cheerio from "cheerio";

import {Executor, SpecNode} from "./op";

export class Extract extends SpecNode {

    instructions: Array<any>

    constructor(instructions: Array<any> = []) {
        super()
        this.instructions = instructions
    }

    executor(parent: Executor = null): ExtractExecutor {
        return new ExtractExecutor(this, parent)
    }
}


export class ExtractExecutor extends Executor {

    node: Extract
    content: null
    pointer: null

    constructor(node: Extract, executor: Executor) {
        super(node, executor)
    }

    exec(done: Function) {
        let self = this

        let $: any = cheerio.load(this.$parent.content)
        let context: any = null

        this.node.instructions.forEach(_=> {
            console.log('INST',_)
            if (_.hasOwnProperty('$match')) {
                context = self.doMatch($, _, context)
            } else if (_.hasOwnProperty('$project')) {
                context = self.doProject($, _, context)
            }
        })

        let out: any = null
        console.log(context)
        if (context.hasOwnProperty('_root')) {
            out = $.html(context)
        }else{
        }

        console.log(out)




        done(null, out);
    }


    doMatch($: any, definition: any, context: any) {
        let selector = definition['$match']
        return $(selector, context)
    }

    doProject($: any, definition: any, context: any) {
        let project = definition['$project']
        let keys = Object.keys(project)

    }

}
