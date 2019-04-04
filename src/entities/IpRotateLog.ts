import {Column, CreateDateColumn, PrimaryGeneratedColumn} from "typeorm";
import {ProtocolType} from "../libs/specific/ProtocolType";

import {Entity} from "typeorm/decorator/entity/Entity";


@Entity()
//@Index("unique_addr_proto", (ipaddr: IpRotate) => [ipaddr.protocol, ipaddr.addr_id], { unique: true })
export class IpRotateLog {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: false})
  protocol: ProtocolType;

  @Column({nullable: false})
  protocol_dest: ProtocolType;

  @Column({nullable: false})
  addr_id: number;

  @Column({type: 'boolean', nullable: false})
  success: boolean = true

  @Column({type: 'datetime', nullable: true})
  start: Date = null;

  @Column({type: 'datetime', nullable: true})
  stop: Date = null;


  @Column({nullable: false})
  duration: number = 0

  @Column({nullable: true})
  error: string

  @Column({nullable: true})
  statusCode: number

  @CreateDateColumn()
  created_at: Date;


}
