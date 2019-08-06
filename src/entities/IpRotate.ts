import {Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';


import {Index} from 'typeorm/decorator/Index';
import {ProtocolType} from '../libs/specific/ProtocolType';

import {Entity} from 'typeorm/decorator/entity/Entity';


@Entity()
@Index('unique_addr_proto', (ipaddr: IpRotate) => [ipaddr.protocol_src, ipaddr.addr_id], {unique: true})
export class IpRotate {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: false})
  protocol_src: ProtocolType;


  @Column({nullable: false})
  addr_id: number;

  @Column({nullable: false})
  successes: number = 0;

  @Column({nullable: false})
  errors: number = 0;

  @Column({nullable: false})
  duration: number = 0;

  @Column({nullable: false})
  duration_average: number = 0;

  @Column({nullable: false})
  inc: number = 0;

  @Column({nullable: false})
  used: number = 0;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;


}
