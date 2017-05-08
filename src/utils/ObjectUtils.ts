
type ObjectType<T> = { new (): T }|Function;

export function createObjectByType<T>(obj:Function) : T {
/* Try 01
    let tmp: any  = Object.create(obj.prototype);
    let _obj:T  = tmp as T
*/

    let _obj:T = Reflect.construct(obj,[])
    return _obj
}