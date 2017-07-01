
export default class TodoException extends Error {
    constructor(msg:string = 'TODO EXCEPTION'){
        super(msg)
    }
}