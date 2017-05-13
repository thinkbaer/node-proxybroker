import * as events from 'events'
import {IAsyncQueueOptions} from "./IAsyncQueueOptions";
import {IQueueProcessor} from "./IQueueProcessor";
import {IQueueWorkload} from "./IQueueWorkload";
import {QueueJob} from "./QueueJob";


const ASYNC_QUEUE_DEFAULT: IAsyncQueueOptions = {
    concurrent: 5
}

export class AsyncWorkerQueue<T extends IQueueWorkload> extends events.EventEmitter {

    static readonly E_NO_RUNNING_JOBS = 'running empty'
    static readonly E_DO_PROCESS = 'process'

    _paused : boolean = false

    options: IAsyncQueueOptions;

    processor: IQueueProcessor<T>

    runningTasks: number = 0

    worker: Array<QueueJob<T>>

    constructor(processor: IQueueProcessor<T>, options: IAsyncQueueOptions = {}) {
        super()
        this.options = Object.assign(options, ASYNC_QUEUE_DEFAULT);
        this.processor = processor
        this.worker = []
        this.on(AsyncWorkerQueue.E_DO_PROCESS, this.process.bind(this))
        this.on('enqueue', this.enqueue.bind(this))
    }

    private next() {
        this.runningTasks--
        if(this.isPaused()){
            if(!this.isRunning()){
                this.emit(AsyncWorkerQueue.E_NO_RUNNING_JOBS)
            }
        }else{
            this.fireProcess()
        }

    }

    private paused() {

    }

    private process() {
        // ignore if is paused
        if(this._paused) {
            return;
        }

        if (!this.isOccupied() && this.enqueued() > 0) {
            // room for additional job
            let worker = this.worker.shift()
            let self = this

            this.runningTasks++
            Promise.resolve(worker)
                .then((worker) => {
                    worker.doStart()
                    return worker
                })
                .then((worker) => {
                    return self.processor.do(worker.workload())
                })
                .then(function (_result) {
                    worker.doStop()
                    self.next()
                })

        } else {
            if (this.amount() === 0) {
                // notthing to do
                this.emit('drain')
            } else {
                // worker exists and occupied
            }
        }
    }


    private enqueue(job: QueueJob<T>) {
        this.worker.push(job)
        job.doEnqueue();
        this.fireProcess()
    }


    private fireProcess(){
        this.emit(AsyncWorkerQueue.E_DO_PROCESS)
    }


    /**
     * all processed queue is empty
     */
    await(): Promise<void> {
        let self = this
        return new Promise<void>(function (resolve) {
            self.once('drain', function () {
                resolve()
            })
        })
    }

    /**
     * Creates a new QueueJob for passed entry and return a promise which that the job will be enqueued
     *
     * @param entry
     * @returns {QueueJob<T>}
     */
    push(entry: T): Promise<QueueJob<T>> {
        let _entry: QueueJob<T> = new QueueJob(this, entry)
        let $p = _entry.enqueued()
        this.emit('enqueue', _entry)
        return $p;
    }


    running() {
        return this.runningTasks
    }


    enqueued() {
        return this.worker.length
    }

    amount() {
        return this.running() + this.enqueued()
    }

    isPaused() {
        return this._paused
    }

    isRunning() {
        return this.runningTasks > 0
    }

    isIdle() {
        return this.enqueued() + this.runningTasks === 0
    }

    isOccupied() {
        return this.runningTasks >= this.options.concurrent
    }

    // TODO impl
    pause() : Promise<boolean> {
        let self = this
        this._paused = true
        return new Promise(function (resolve) {
            if(self.isRunning()){
                self.once(AsyncWorkerQueue.E_NO_RUNNING_JOBS, function () {
                    resolve(self._paused)
                })
            }else{
                resolve(self._paused)
            }
        })
    }

    // TODO impl
    resume() {
        this._paused = false
        this.fireProcess()
    }


}