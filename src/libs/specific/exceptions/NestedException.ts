

export class NestedException extends Error {

    private _code : string;

    private _error : Error;

    constructor(err: Error, code:string){
        super();
        this._error = err;
        this._code = code
    }

    get stack():string{
        return this.error.stack
    }

    get code():string{
        return this._code
    }

    get name():string{
        return this.error.name
    }

    get message():string{
        return this.error.message
    }

    get error():Error{
        return this._error
    }

    toString() :string{
        return [this.name, this.message].join(': ')
    }

}