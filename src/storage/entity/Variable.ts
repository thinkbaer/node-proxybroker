
import {Column, PrimaryColumn} from "typeorm";
import {ColumnType} from "typeorm/driver/types/ColumnTypes";
import {Entity} from "typeorm/decorator/entity/Entity";

@Entity()
export class Variable {

    @PrimaryColumn( <ColumnType>"string" ,{ length : 128 })
    key: string;


    @Column()
    value: string;

}