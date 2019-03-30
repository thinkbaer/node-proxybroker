

import {Storage} from "../../generic/storage/Storage";
import {IpAddr} from "../../../entities/IpAddr";
import {IpLoc} from "../../../entities/IpLoc";
import {IpAddrState} from "../../../entities/IpAddrState";

export class Statistics {

    storage: Storage

    constructor(storage:Storage){
        this.storage = storage
    }


    async stats():Promise<any>{
        let stats = {
            all:0,
            active:0,
            protocol:{},
            level:{},
            country:{}
        }

        let c = await this.storage.connect()
        let q = c.manager.createQueryBuilder(IpAddr,'ip')
        q.innerJoin(IpAddrState,'state', `state.addr_id = ip.id and state.validation_id = ip.validation_id`)
        q.leftJoin(IpLoc,'loc', `loc.ip = ip.ip`)
        q.select(`state.protocol`)
        q.addSelect(`state.enabled`)
        q.addSelect(`state.level`)
        q.addSelect(`loc.country_code`)
        q.addSelect(`count(*)`,`count_all`)
        q.groupBy(`state.protocol`)
        q.addGroupBy(`state.enabled`)
        q.addGroupBy(`state.level`)
        q.addGroupBy(`loc.country_code`)

        let query = q.getSql()
        let list = await c.manager.query(query)

        for(let x of list){
            let c = parseInt(x.count_all)
            stats.all += c

            if(x.state_enabled){

                stats.active += c;

                if(x.state_protocol){
                    if(!stats.protocol.hasOwnProperty(x.state_protocol)){
                        stats.protocol[x.state_protocol] = 0
                    }
                    stats.protocol[x.state_protocol] += c;
                }

                if(x.state_level > -2){
                    if(!stats.level.hasOwnProperty(x.state_level)){
                        stats.level[x.state_level] = 0
                    }
                    stats.level[x.state_level] += c;
                }

                if(x.loc_country_code){
                    if(!stats.country.hasOwnProperty(x.loc_country_code)){
                        stats.country[x.loc_country_code] = 0;
                    }
                    stats.country[x.loc_country_code] += c;
                }
            }

        }

        await c.close()

        return stats
    }





    countTables(){

    }

    count(){


    }


}