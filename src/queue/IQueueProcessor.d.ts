

import {IQueueWorkload} from "./IQueueWorkload";


export interface IQueueProcessor<T extends IQueueWorkload> {

    do(workLoad: T): Promise<void>;

    onEmpty?(): Promise<void>
}
