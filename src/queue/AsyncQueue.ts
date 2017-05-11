import * as events from 'events'

export interface IQueueProcessor<T> {

    do(workLoad: T): Promise<void>;

    onEmpty?(): Promise<void>
}


export interface IAsyncQueueOptions {
    concurrent?: number

}


const ASYNC_QUEUE_DEFAULT: IAsyncQueueOptions = {
    concurrent: 5
}

export class AsyncQueue<T> extends events.EventEmitter {

    options: IAsyncQueueOptions;

    processor: IQueueProcessor<T>

    runningTasks: number = 0

    worker: Array<T>

    constructor(processor: IQueueProcessor<T>, options: IAsyncQueueOptions = {}) {
        super()
        this.options = Object.assign(options, ASYNC_QUEUE_DEFAULT);
	this.processor = processor
	this.worker = []
        this.on('process', this.process.bind(this))
    }


    private process() {
        if (!this.isOccupied() && this.length() > 0) {
            // room for additional job
            let worker = this.worker.shift()
            let self = this

            this.runningTasks++

            return self.processor.do(worker)
                .then(function (_result) {
                    this.runningTasks--
                })

        } else {
            if (this.length() === 0) {
                // notthing to do
                this.emit('drain')
            } else {
                // worker exists and occupied
            }
        }
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


    push(entry: T) {
        this.worker.push(entry)
        this.emit('process')
    }

    length() {
        return this.worker.length
    }

    running() {
        return this.runningTasks > 0
    }

    idle() {
        return this.length() + this.runningTasks === 0
    }

    isOccupied() {
        return this.runningTasks >= this.options.concurrent
    }

    pause() {
    }

    resume() {
    }


}