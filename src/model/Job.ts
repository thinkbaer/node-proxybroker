
import {Entity} from "typeorm/decorator/entity/Entity";
import {
    AfterLoad,
    BeforeInsert, BeforeUpdate, Column, CreateDateColumn, PrimaryColumn, PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";
import {Index} from "typeorm/decorator/Index";

@Entity()
@Index("unique_fetchjob_key", (ipAddr: Job) => [ipAddr.key], { unique: true })
@Index("unique_fetchjob_name_and_type", (ipaddr: Job) => [ipaddr.name, ipaddr.type], { unique: true })
export class Job {

    @PrimaryGeneratedColumn()
    id : number;

    @Column()
    key: string;

    @Column()
    name: string;

    @Column({nullable:true})
    type: string;

    @Column({type:'json',nullable:true})
    data: any;

    @Column({type:"boolean"})
    active: boolean;

    @Column({type:"boolean"})
    enabled: boolean;

    @Column({nullable:true})
    last_state_id: number = null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;



    @BeforeInsert()
    @BeforeUpdate()
    _prepare(){
        if(!this.key){
            this.key = [this.name,this.type].join(':')
        }
    }


    @AfterLoad()
    _load(){
        /*
        this.active = this['active']   === 1
        this.enabled = this['enabled'] === 1
         console.log(this.active,this.enabled)
        */

    }
}