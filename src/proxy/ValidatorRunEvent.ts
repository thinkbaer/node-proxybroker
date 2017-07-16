import {EventBus} from "../events/EventBus";




export class ValidatorRunEvent {


    constructor(){}

    fire():Promise<any> {
        return EventBus.post(this)
    }

}
