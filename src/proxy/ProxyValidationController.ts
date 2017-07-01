import subscribe from "../events/decorator/subscribe"

import {IJudgeOptions} from "../judge/IJudgeOptions";
import {Judge} from "../judge/Judge";
import {AsyncWorkerQueue} from "../queue/AsyncWorkerQueue";
import {ProxyData} from "./ProxyData";

import {IQueueProcessor} from "../queue/IQueueProcessor";
import {QueueJob} from "../queue/QueueJob";
import {ProxyDataValidateEvent} from "./ProxyDataValidateEvent";

export class ProxyValidationController implements IQueueProcessor<ProxyData> {

    wakeuped:boolean = false

    queue: AsyncWorkerQueue<ProxyData>

    judge: Judge

    constructor(judgeOptions:IJudgeOptions){
        let parallel: number = 200
        this.judge = new Judge(judgeOptions)
        this.queue = new AsyncWorkerQueue<ProxyData>(this, {concurrent: parallel})
    }


    @subscribe(ProxyDataValidateEvent)
    async validate(event: ProxyDataValidateEvent):Promise<any>{
        let queueJob = await this.push(event.data)
        queueJob = await queueJob.done()
        let proxyData = queueJob.workload()

        // console.log(proxyData)
        // what should be saved ???
        /*
        if we have no positive results for http and https then
            if record already exists then
                set update_at and last_error_at to now
            else
                insert record with last_checked and last_success_at = null and last_error_at = now
            finally
                add

         */

        if(event.isNew){

        }else{
            let record = event.record

        }

        return Promise.resolve(event)
    }



    async prepare():Promise<boolean>{
        let booted = await this.judge.bootstrap()
        return Promise.resolve(booted)
    }

    async push(o:ProxyData):Promise<QueueJob<ProxyData>>{
        if(!this.judge.isEnabled()){
            this.wakeuped = true
            // if multi push??
            await this.judge.wakeup()
        }
        return this.queue.push(o)
    }

    async await():Promise<void>{
        if(this.queue.amount() > 0 || this.wakeuped){
            return this.queue.await()
        }else{
            return Promise.resolve()
        }

    }

    async shutdown(){
        if(this.judge.isEnabled()){
            this.wakeuped = false
            await this.judge.pending()
        }

    }

    async do(workLoad: ProxyData): Promise<any> {
        let results = await this.judge.validate(workLoad.ip, workLoad.port)
        workLoad.results = results
        return Promise.resolve(results)
    }


    onEmpty(): Promise<void> {
        //this.wakeuped = false
        console.log('DONE?')
        return null;
    }
}