

import {Entity} from "typeorm/decorator/entity/Entity";
import {Column, CreateDateColumn, PrimaryColumn, UpdateDateColumn} from "typeorm";


@Entity()
export class IpLoc {

    @PrimaryColumn({type:"varchar",length:15})
    ip: string;

    @Column({nullable:true})
    country_code: string;

    @Column({nullable:true})
    country_name: string;

    @Column({nullable:true})
    region_code: string;

    @Column({nullable:true})
    region_name: string;

    @Column({nullable:true})
    city: string;

    @Column({nullable:true})
    zip_code: string;

    @Column({nullable:true})
    time_zone: string;

    @Column({nullable:true})
    metro_code: number;

    @Column({type:'float',nullable:true})
    latitude: number;

    @Column({type:'float',nullable:true})
    longitude: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

}