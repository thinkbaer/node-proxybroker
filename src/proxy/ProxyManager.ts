


import {Judge} from "../judge/Judge";
import {Storage} from "../storage/Storage";
import {ProxyResults} from "./ProxyResults";
import {JudgeResults} from "../judge/JudgeResults";


export class ProxyManager {

    private _storage: Storage = null;

    private _judge: Judge = null

    constructor(storage:Storage, judge:Judge){
        this._storage = storage
        this._judge = judge
    }

    find(){
        //this._storage.connection.
    }

    async validate(ip:string,port:number):Promise<ProxyResults>{

        let results:JudgeResults = await this._judge.validate(ip,port)




        return null

    }


    save(){

    }
}