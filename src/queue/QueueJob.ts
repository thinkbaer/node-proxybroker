import {IQueueWorkload} from "./IQueueWorkload";
import {shorthash} from "../lib/crypt";
import {inspect} from "util"
import {IQueue} from "./IQueue";
import Timer = NodeJS.Timer;


export class QueueJob<T extends IQueueWorkload> {

    private static _INC = 0;
    private _TIMEOUT = 20000;

    private _id: string;

    private _queue: IQueue;

    private _workload: T;

    private _start: Date = null;
    private _stop: Date = null;
    private _enqueued: Date = null;
    private _duration: number;

    // create a timer which destroy long running jobs
    private _timer: Timer = null;

    constructor(queue: IQueue, workload: T) {
        this._workload = workload;
        this._queue = queue;
        this._id = shorthash((new Date()).getTime() + '' + (QueueJob._INC++));
        /*
         this._queue.once('job '+this._id+' start',this.onStart.bind(this));
         this._queue.once('job '+this._id+' start',this.onStart.bind(this));

         */
        this._queue.once('job '+this._id+' stop',this.onDone.bind(this))
    }

    public get id(): string {
        return this._id
    }

    public workload(): T {
        return this._workload
    }

    public enqueued(): Promise<QueueJob<T>> {
        let self = this;
        return new Promise(function (resolve) {
            if (!self._enqueued) {
                self._queue.once('job ' + self.id + ' enqueued', function (job: QueueJob<T>) {
                    resolve(job)
                })
            } else {
                resolve(self)
            }
        })
    }

    public starting(): Promise<QueueJob<T>> {
        let self = this;
        return new Promise(function (resolve) {
            if (!self._start) {
                self._queue.once('job ' + self.id + ' start', function () {
                    resolve(self)
                })
            } else {
                // if started then pass through
                resolve(self)
            }
        })
    }

    public done(): Promise<QueueJob<T>> {
        let self = this;
        return new Promise(function (resolve) {
            if (!self._stop) {
                self._queue.once('job ' + self.id + ' stop', function () {
                    resolve(self)
                })
            } else {
                // if stopped then pass through
                resolve(self)
            }
        })
    }

    public doEnqueue() {
        this._enqueued = new Date();
        this._queue.emit('job ' + this._id + ' enqueued', this)
    }

    public doStart() {
        this._start = new Date();
        this._queue.emit('job ' + this._id + ' start')
    }

    public doStop() {
        this._stop = new Date();
        this._duration = this._stop.getTime() - this._start.getTime();
        this._queue.emit('job ' + this._id + ' stop')
    }

    public isEnqueued() : boolean{
        return this._enqueued != null && this._start == null && this._stop == null
    }

    public isStarted() : boolean{
        return this._enqueued != null && this._start != null && this._stop == null
    }

    public isFinished() : boolean{
        return this._enqueued != null && this._start != null && this._stop != null
    }

    private onDone() {
        this.finalize()
    }


    private finalize() {
        this._queue.removeAllListeners('job ' + this._id + ' start');
        this._queue.removeAllListeners('job ' + this._id + ' stop');
        this._queue.removeAllListeners('job ' + this._id + ' enqueued');

    }


}