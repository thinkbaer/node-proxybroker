import {Event} from 'commons-eventbus/decorator/Event';
import {ProxyData} from '../libs/proxy/ProxyData';


@Event()
export class ProxyDataValidateEvent {

  data: ProxyData;

  // isNew: boolean = true;

  // record: IpAddr = null;

  fired = false;

  // jobState: JobState = null;


  constructor(data?: ProxyData /*, jobState?: JobState*/) {

    // this.jobState = jobState;
    // if (!this.jobState) {
    //   this.jobState = new JobState();
    // }

    // this.isNew = false;
    this.data = data;
  }

  /*
  fire() {
    this.fired = true;
    /*
    if(!this.record){
        this.isNew = true
    }* /

    EventBus.post(this)
  }
  */

  markFired() {
    this.fired = true;
  }

  isFired() {
    return this.fired;
  }
}
