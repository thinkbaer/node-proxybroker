import {
    Column,  PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
     BeforeInsert, BeforeUpdate
} from "typeorm";

import {Utils} from "../../utils/Utils";
import {Index} from "typeorm/decorator/Index";
import {ProtocolType} from "../../lib/ProtocolType";
import {ColumnType} from "typeorm/driver/types/ColumnTypes";
import {Entity} from "typeorm/decorator/entity/Entity";


@Entity()
@Index("unique_key_with_combination_of_ip_port", (ipAddr: IpAddr) => [ipAddr.key], { unique: true })
@Index("unique_ip_and_port", (ipaddr: IpAddr) => [ipaddr.ip, ipaddr.port], { unique: true })
export class IpAddr {

    @PrimaryGeneratedColumn(<ColumnType>"number")
    id: number;

    // ip : port
    @Column()
    key: string;

    @Column()
    ip: string;

    @Column()
    port: number;

    @Column()
    check_id: number = 0

    @Column()
    protocols: number = 0

    @Column({type:'boolean'})
    blocked: boolean = false;

    @Column({type:'boolean'})
    to_delete: boolean = false;

    @Column({type:'datetime',nullable:true})
    last_checked_at: Date;

    @Column()
    count_errors: number = 0

    @Column({type:'datetime',nullable:true})
    errors_since_at: Date = null;

    @Column()
    count_success: number = 0

    @Column({type:'datetime',nullable:true})
    success_since_at: Date = null;


    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;


    constructor(){}

    @BeforeInsert()
    @BeforeUpdate()
    _prepare(){
        if(!this.key){
            this.key = [this.ip,this.port].join(':')
        }
        // let now = Utils.now()
        // if(this.blocked === null || this.blocked === undefined){
        //     this.blocked = false
        // }
        //
        // if(this.to_delete === null || this.to_delete === undefined) {
        //     this.to_delete = false
        // }
        // if(!this.last_checked_at){
        //     this.last_checked_at = now
        // }
    }

    flattenDates(){
        if(this.created_at){
            this.created_at = Utils.flattenDate(this.created_at)
        }

        if(this.updated_at){
            this.updated_at = Utils.flattenDate(this.updated_at)
        }
    }


    addProtocol(pt: ProtocolType){
        this.protocols = this.protocols | pt
    }

    removeProtocol(pt: ProtocolType){
        this.protocols = this.protocols & ~pt
    }

    supportsProtocol(p:ProtocolType):boolean{
        return (this.protocols & p) == p
    }

    supportsHttp():boolean{
        return this.supportsProtocol(ProtocolType.HTTP)
    }

    supportsHttps():boolean{
        return this.supportsProtocol(ProtocolType.HTTPS)
    }

    supportsBoth(){
        return this.supportsHttp() && this.supportsHttps()
    }


}