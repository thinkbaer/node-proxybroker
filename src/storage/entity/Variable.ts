
import {Entity, Column, PrimaryColumn} from "typeorm";
import {ColumnTypes} from "typeorm/metadata/types/ColumnTypes";

@Entity()
export class Variable {

    @PrimaryColumn(ColumnTypes.STRING, { length : 128 })
    key: string;


    @Column(ColumnTypes.STRING)
    value: string;

}