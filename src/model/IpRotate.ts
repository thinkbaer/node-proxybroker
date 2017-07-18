

import {
    Column,  PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
    BeforeInsert, BeforeUpdate
} from "typeorm";

import {Utils} from "../utils/Utils";
import {Index} from "typeorm/decorator/Index";
import {ProtocolType} from "../lib/ProtocolType";

import {Entity} from "typeorm/decorator/entity/Entity";


@Entity()
@Index("unique_addr_proto", (ipaddr: IpRotate) => [ipaddr.protocol, ipaddr.addr_id], { unique: true })
export class IpRotate {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({nullable:false})
    protocol: ProtocolType;

    @Column({nullable:false})
    addr_id: number;

    @Column({nullable:false})
    used:number = 0

    @Column({nullable:false})
    inc:number = 0


    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;


    constructor(){}

    flattenDates(){
        if(this.created_at){
            this.created_at = Utils.flattenDate(this.created_at)
        }

        if(this.updated_at){
            this.updated_at = Utils.flattenDate(this.updated_at)
        }
    }


}