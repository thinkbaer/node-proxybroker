
import {EventEmitter} from 'events'
import TodoException from "../exceptions/TodoException";



export class Progress extends EventEmitter {

    progressing: boolean = false;
    //active:number=0

    done:number=0;
    enqueued:number=0;

    constructor(){
        super()
        this.setMaxListeners(10000)
    }

    waitTillDone(){
        let self = this;
        return new Promise((resolve, reject) => {
            if(!self.progressing){
                resolve(self.progressing)
            }else{
                self.once('empty',function () {
                    resolve(self.progressing)
                })
            }
        })
    }

    startWhenReady():Promise<boolean>{
        let self = this;
        let siwtched = false
        if(!self.progressing) {
            self.progressing = siwtched = true;
        }
        return new Promise((resolve, reject) => {
            if(siwtched){
                resolve(self.progressing)
            }else{
                self.once('empty',function () {
                    resolve(self.progressing)
                })
            }
        })
    }

    ready(){
        this.done++;
        this.progressing = false;
        this.emit('empty')
        /*
        if(this.done == this.enqueued){

        }else if(this.done < this.enqueued){
            this.emit('stop_'+this.done)
        }else{
            throw new TodoException()
        }*/
    }

}