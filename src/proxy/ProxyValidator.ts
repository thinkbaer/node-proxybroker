

import {IJudgeOptions} from "../judge/IJudgeOptions";
import {Judge} from "../judge/Judge";
import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import {ProxyData} from "./ProxyData";

import {IQueueProcessor} from "../queue/IQueueProcessor";
import {QueueJob} from "../queue/QueueJob";

export class ProxyValidationController implements IQueueProcessor<ProxyData> {

    queue: AsyncWorkerQueue<ProxyData>

    judge: Judge

    constructor(judgeOptions:IJudgeOptions){
        let parallel: number = 200
        this.judge = new Judge(judgeOptions)
        this.queue = new AsyncWorkerQueue<ProxyData>(this, {concurrent: parallel})
    }

    async prepare():Promise<boolean>{
        let booted = await this.judge.bootstrap()
        return Promise.resolve(booted)
    }

    async push(o:ProxyData):Promise<QueueJob<ProxyData>>{
        if(!this.judge.isEnabled()){
            await this.judge.wakeup()
        }
        return this.queue.push(o)
    }

    async await():Promise<void>{
        return this.queue.await()
    }

    async shutdown(){
        if(this.judge.isEnabled()){
            await this.judge.pending()
        }

    }

    async do(workLoad: ProxyData): Promise<any> {
        let results = await this.judge.validate(workLoad.ip, workLoad.port)
        workLoad.results = results
        return Promise.resolve(results)
    }


    onEmpty(): Promise<void> {
        console.log('DONE?')
        return null;
    }
}