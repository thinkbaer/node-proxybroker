// Reference mocha-typescript's global definitions:
// <reference path="../node_modules/mocha-typescript/globals.d.ts" />

import { suite, test, slow, timeout } from "mocha-typescript";
import {AsyncQueue, IQueueProcessor} from "../../src/queue/AsyncQueue";
import {expect} from "chai";

// describe('',() => {})


interface IWorker {

}

class WorkStuff implements IWorker {

}

class Processor implements IQueueProcessor<WorkStuff>{

    do(workLoad: WorkStuff): Promise<void> {
        // doing something with the workload
        return new Promise<void>(function (resolve) {
            setTimeout(function(){
                resolve()
            },100)
        })
    }


    onEmpty(): Promise<void> {
        return null;
    }
}


@suite('Async queue')
class Two {


    @test
    async method() {
        let p = new Processor()
        let q = new AsyncQueue<WorkStuff>(p)

        q.push(new WorkStuff())
        expect(q.length()).to.eq(1)

        await q.await()
        expect(q.length()).to.eq(0)


    }
}