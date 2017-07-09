import * as _ from 'lodash'
import * as events from 'events'
import {IAsyncQueueOptions} from "./IAsyncQueueOptions";
import {IQueueProcessor} from "./IQueueProcessor";
import {IQueueWorkload} from "./IQueueWorkload";
import {QueueJob} from "./QueueJob";
import {Log} from "../logging/Log";
import {Utils} from "../utils/Utils";


const ASYNC_QUEUE_DEFAULT: IAsyncQueueOptions = {
    name:'none',
    concurrent: 5
};

export class AsyncWorkerQueue<T extends IQueueWorkload> extends events.EventEmitter {

    static readonly E_NO_RUNNING_JOBS = 'running empty';
    static readonly E_DO_PROCESS = 'process';
    static readonly E_DRAIN = 'drain';
    static readonly E_ENQUEUE = 'enqueue';

    _inc: number = 0;
    _done: number = 0;

    _paused: boolean = false;

    options: IAsyncQueueOptions;

    processor: IQueueProcessor<T>;

    runningTasks: number = 0;

    worker: Array<QueueJob<T>> = [];

    active: Array<QueueJob<T>> = [];

    constructor(processor: IQueueProcessor<T>, options: IAsyncQueueOptions = {name:'none'}) {
        super();
        this.setMaxListeners(100)
        this.options = Utils.merge(ASYNC_QUEUE_DEFAULT, options);
        this.processor = processor;
        this.on(AsyncWorkerQueue.E_DO_PROCESS, this.process.bind(this));
        this.on(AsyncWorkerQueue.E_ENQUEUE, this.enqueue.bind(this));
        this.on(AsyncWorkerQueue.E_DRAIN, this.drained.bind(this))
    }

    private next() {
        this.runningTasks--;

        Log.debug('Tasks in queue['+this.options.name+'] INC:' + this._inc + ' DONE:' + this._done + ' RUNNING:' + this.running() + ' TODO:' + this.enqueued() + ' ACTIVE:' + this.active.length);
        /*
        if (this.active.length < 5) {
            let out = '';
            this.active.forEach(_q => {
                out += _q.workload()['ip'] + ':' + _q.workload()['port'] + '; '
            });
            Log.debug('Active tasks IDs:' + out)
        }
        */
        if (this.isPaused()) {
            if (!this.isRunning()) {
                this.emit(AsyncWorkerQueue.E_NO_RUNNING_JOBS)
            }
        } else {
            this.fireProcess()
        }

    }

    private paused() {

    }

    private process() {
        // ignore if is paused
        if (this._paused) {
            return;
        }

        if (!this.isOccupied() && this.enqueued() > 0) {
            // room for additional job
            let worker = this.worker.shift();
            let self = this;
            self.active.push(worker);

            this.runningTasks++;
            Promise.resolve(worker)
                .then((_worker) => {
                    self._inc++;
                    _worker.doStart();
                    return _worker
                })
                .then(async (_worker) => {
                    await self.processor.do(_worker.workload());
                    return _worker
                })
                .then(function (_worker) {
                    _.remove(self.active, _worker);
                    _worker.doStop();
                    self._done++;
                    self.next()
                })
                .catch((err) => {
                    Log.error('Queue=>', err)
                })

        } else {
            if (this.amount() === 0) {
                // notthing to do
                this.emit(AsyncWorkerQueue.E_DRAIN)
            } else {
                // worker exists and occupied
            }
        }
    }


    private enqueue(job: QueueJob<T>) {
        this.worker.push(job);
        job.doEnqueue();
        this.fireProcess()
    }

    private drained(){
        if(this.processor.onEmpty){
            this.processor.onEmpty()
        }
    }

    private fireProcess() {
        this.emit(AsyncWorkerQueue.E_DO_PROCESS)
    }


    /**
     * all processed queue is empty
     */
    await(): Promise<void> {
        let self = this;

        return new Promise<void>(function (resolve) {
            if (self.amount() > 0) {
                self.once(AsyncWorkerQueue.E_DRAIN, function () {
                    resolve()
                })
            }else{
                resolve()
            }
        })
    }


    /**
     * Creates a new QueueJob for passed entry and return a promise which that the job will be enqueued
     *
     * @param entry
     * @returns {QueueJob<T>}
     */
    push(entry: T): Promise<QueueJob<T>> {
        let _entry: QueueJob<T> = new QueueJob(this, entry);
        let $p = _entry.enqueued();
        this.emit('enqueue', _entry);
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
    pause(): Promise<boolean> {
        let self = this;
        this._paused = true;
        return new Promise(function (resolve) {
            if (self.isRunning()) {
                self.once(AsyncWorkerQueue.E_NO_RUNNING_JOBS, function () {
                    resolve(self._paused)
                })
            } else {
                resolve(self._paused)
            }
        })
    }

// TODO impl
    resume() {
        this._paused = false;
        this.fireProcess()
    }


}