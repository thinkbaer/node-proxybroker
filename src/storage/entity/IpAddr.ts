import {Entity, Column, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {ColumnTypes} from "typeorm/metadata/types/ColumnTypes";


@Entity()
export class IpAddr {

    @PrimaryGeneratedColumn(ColumnTypes.BIGINT)
    id: number;

    @Column(ColumnTypes.STRING)
    address: string;

    @Column(ColumnTypes.INT)
    port: number;

    @Column(ColumnTypes.DATETIME)
    created_at: Date;

    @Column(ColumnTypes.DATETIME)
    updated_at: Date;



}