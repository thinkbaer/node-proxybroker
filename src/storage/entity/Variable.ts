
import {Column, PrimaryColumn} from "typeorm";
import {Entity} from "typeorm/decorator/entity/Entity";

@Entity()
export class Variable {

    @PrimaryColumn( {type:"varchar",length : 128 })
    key: string;


    @Column()
    value: string;

}