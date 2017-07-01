import {Entity, Column, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {ColumnTypes} from "typeorm/metadata/types/ColumnTypes";
import {Utils} from "../../utils/Utils";


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

    @Column(ColumnTypes.BOOLEAN)
    to_delete: boolean;

    @Column(ColumnTypes.DATETIME)
    last_checked_at: Date;

    @Column(ColumnTypes.DATETIME,{nullable:true})
    last_error_at: Date = null;

    @Column(ColumnTypes.DATETIME,{nullable:true})
    last_success_at: Date = null;

    @Column(ColumnTypes.DATETIME)
    created_at: Date;

    @Column(ColumnTypes.DATETIME)
    updated_at: Date;


    constructor(){}

    preUpdate(){
        let now = Utils.now()

        if(!this.created_at){
            this.created_at = now
        }
        this.updated_at = now
        if(this.blocked === null || this.blocked === undefined){
            this.blocked = false
        }

        if(this.to_delete === null || this.to_delete === undefined) {
            this.to_delete = false
        }

        if(!this.last_checked_at){
            this.last_checked_at = now
        }
    }




}