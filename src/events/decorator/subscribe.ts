import EventBusMeta from "../EventBusMeta";
export function isDescriptor(desc: any) {
    if (!desc || !desc.hasOwnProperty) {
        return false;
    }
    const keys = ['value', 'initializer', 'get', 'set'];
    for (let i = 0, l = keys.length; i < l; i++) {
        if (desc.hasOwnProperty(keys[i])) {
            return true;
        }
    }

    return false;
}

export function decorate(handleDescriptor: Function, entryArgs: any[]) {
    if (isDescriptor(entryArgs[entryArgs.length - 1])) {
        return handleDescriptor(...entryArgs, []);
    } else {
        return function () {
            return handleDescriptor(...Array.prototype.slice.call(arguments), entryArgs);
        };
    }
}

function handleDescriptor(target: Function, key: any, descriptor: PropertyDescriptor, ...args: any[]) {
    // console.log(target,key,descriptor,args)
    EventBusMeta.$().register(target, key, descriptor, args.shift())
    return descriptor;
}

export default function subscribe(clazz: Function,...args:any[]) {
    let _args = Array.prototype.slice.call(arguments)
    return decorate(handleDescriptor, _args)
}