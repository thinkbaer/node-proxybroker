// Reference mocha-typescript's global definitions:
/// <reference path="../../node_modules/mocha-typescript/globals.d.ts" />

import {suite, test, slow, timeout, pending} from "mocha-typescript";
import {expect} from "chai";
import {AsyncWorkerQueue} from "../../src/libs/generic/queue/AsyncWorkerQueue";
import {IQueueProcessor} from "../../src/libs/generic/queue/IQueueProcessor";
import {IQueueWorkload} from "../../src/libs/generic/queue/IQueueWorkload";
import {QueueJob} from "../../src/libs/generic/queue/QueueJob";

// describe('',() => {})

// (function(){})()

class Workload implements IQueueWorkload {

}


class Processor implements IQueueProcessor<Workload>{

    do(workLoad: Workload): Promise<void> {
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
class AsyncQueueTests {


    @test
    async enqueueSingleWorkloadAndWaitUntilAllDone() {
        let p = new Processor();
        let q = new AsyncWorkerQueue<Workload>(p);
        await q.pause();
        expect(q.isPaused()).to.eq(true);

        q.push(new Workload());
        q.resume();
        expect(q.isPaused()).to.eq(false);
        expect(q.amount()).to.eq(1);

        await q.await();
        expect(q.amount()).to.eq(0)
    }

    @test
    async enqueueMultipleWorkloadAndWaitUntilAllDone() {
        let parallel : number = 5;
        let p = new Processor();
        let q = new AsyncWorkerQueue<Workload>(p, {name:'enqueue_test',concurrent:parallel});

        for(let i=0;i<20;i++){
            q.push(new Workload());
            expect(q.amount()).to.greaterThan(0);
            expect(q.running()).to.lessThan(parallel+1)
        }

        await q.await();
        expect(q.running()).to.eq(0);
        expect(q.enqueued()).to.eq(0);
        expect(q.amount()).to.eq(0)
    }

    @test
    async enqueueSingleWorkloadAndWaitUntilWorkIsDone() {
        let p = new Processor();
        let q = new AsyncWorkerQueue<Workload>(p);
        await q.pause();
        expect(q.isPaused()).to.eq(true);

        let job :QueueJob<Workload> = await q.push(new Workload());
        expect(q.amount()).to.eq(1);
        expect(job.isEnqueued()).to.eq(true);
        expect(job.isStarted()).to.eq(false);
        expect(job.isFinished()).to.eq(false);
        q.resume();
        expect(q.isPaused()).to.eq(false);

        await job.starting();
        expect(job.isEnqueued()).to.eq(false);
        expect(job.isStarted()).to.eq(true);
        expect(job.isFinished()).to.eq(false);

        await job.done();
        expect(job.isEnqueued()).to.eq(false);
        expect(job.isStarted()).to.eq(false);
        expect(job.isFinished()).to.eq(true);
        expect(q.amount()).to.eq(0)
    }

}