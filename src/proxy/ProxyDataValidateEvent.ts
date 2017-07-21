import {EventBus} from "../events/EventBus";
import {ProxyData} from "./ProxyData";
import {JobState} from "../model/JobState";

export class ProxyDataValidateEvent {

    data: ProxyData;

    // isNew: boolean = true;

    // record: IpAddr = null;

    fired: boolean = false;

    jobState:JobState = null;


    constructor(data: ProxyData, jobState?:JobState){
        this.jobState = jobState;
        if(!this.jobState){
            this.jobState = new JobState()
        }
        // this.isNew = false;
        this.data = data
    }

    fire() {
        this.fired = true;
        /*
        if(!this.record){
            this.isNew = true
        }*/

        EventBus.post(this)
    }
}