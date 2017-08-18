import {EventBus} from "../libs/generic/events/EventBus";




export class ValidatorRunEvent {


    constructor(){}

    fire():Promise<any> {
        return EventBus.post(this)
    }

}
