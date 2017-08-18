

import {IQueueWorkload} from "./IQueueWorkload";


export interface IQueueProcessor<T extends IQueueWorkload> {

    do(workLoad: T): Promise<any>;

    onEmpty?(): Promise<void>
}
