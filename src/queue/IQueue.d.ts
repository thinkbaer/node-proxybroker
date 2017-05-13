

export interface IQueue {
    emit(event: string | symbol, ...args: any[]): boolean;
    on(event: string | symbol, listener: Function): this;
    once(event: string | symbol, listener: Function): this;
    removeAllListeners(event?: string | symbol): this;
}