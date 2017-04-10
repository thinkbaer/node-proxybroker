import {Entity, Column, PrimaryColumn, PrimaryGeneratedColumn} from "typeorm";
import {ColumnTypes} from "typeorm/metadata/types/ColumnTypes";

@Entity()
export class Address {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    address: string;

    @Column()
    port: number;

    @Column()
    created_at:Date;

    @Column()
    updated_at:Date;

}