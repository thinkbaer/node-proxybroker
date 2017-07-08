
import {ReqResEvent} from "../judge/ReqResEvent";
import LogEvent from "../logging/LogEvent";
import subscribe from "../events/decorator/subscribe"

export default class StdConsole {

    static $enabled = false;

    @subscribe(ReqResEvent)
    onReqRes(rre: ReqResEvent){
        this.out(rre)
    }

    @subscribe(LogEvent)
    onLog(rre: LogEvent){
        this.out(rre)
    }

    private out(o:LogEvent | ReqResEvent){
        if(StdConsole.$enabled){
            console.error(o.out())
        }
    }
}

