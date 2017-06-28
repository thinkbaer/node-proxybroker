import {Entity, Column, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {ColumnTypes} from "typeorm/metadata/types/ColumnTypes";


@Entity()
export class IpAddr {

    @PrimaryGeneratedColumn(ColumnTypes.BIGINT)
    id: number;

    @Column(ColumnTypes.STRING)
    ip: string;

    @Column(ColumnTypes.INT)
    port: number;

    @Column(ColumnTypes.BOOLEAN)
    blocked: boolean;


    @Column(ColumnTypes.DATETIME)
    last_checked: Date;

    @Column(ColumnTypes.DATETIME)
    created_at: Date;

    @Column(ColumnTypes.DATETIME)
    updated_at: Date;


    preUpdate(){
        let now = new Date()
        if(!this.created_at){
            this.created_at = now
        }
        this.updated_at = now
        this.blocked = false
        if(!this.last_checked){
            this.last_checked = now
        }

    }


}