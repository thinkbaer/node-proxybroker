
export type ObjectType<T> = { new (): T }|Function;
export type StringOrFunction = string | Function

export const K_WORKDIR:string = 'workdir'
export const K_STORAGE:string = 'storage'

export const DEFAULT_CONFIG_OPTIONS = {

}