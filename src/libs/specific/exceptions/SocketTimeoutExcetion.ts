
export default class SocketTimeoutExcetion extends Error{



    constructor(err:Error){
        super(err.message)

    }
}