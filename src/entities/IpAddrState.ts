import {Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";

import {ProtocolType} from "../libs/specific/ProtocolType";
import {Entity} from "typeorm/decorator/entity/Entity";

@Entity()
export class IpAddrState {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({type: "boolean", nullable: false})
  enabled: boolean;

  @Column({nullable: false})
  protocol_src: ProtocolType = ProtocolType.HTTP;


  @Column({nullable: false})
  protocol_dest: ProtocolType;


  @Column({nullable: false})
  addr_id: number;


  // intern counter for done checks, independently of the result
  @Column({nullable: false})
  validation_id: number;


  @Column()
  level: number = -2;

  @Column({type: "datetime", nullable: true})
  start: Date;

  @Column({type: "datetime", nullable: true})
  stop: Date;

  @Column({nullable: true})
  duration: number;

  @Column({nullable: true})
  error_code: string;

  @Column({nullable: true})
  error_message: string;

  @Column({type: "json", nullable: true})
  log: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;


}