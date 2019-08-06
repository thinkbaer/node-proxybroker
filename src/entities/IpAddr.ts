import {BeforeInsert, BeforeUpdate, Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn} from 'typeorm';

import {Index} from 'typeorm/decorator/Index';
import {ProtocolType} from '../libs/specific/ProtocolType';

import {Entity} from 'typeorm/decorator/entity/Entity';


@Entity()
@Index('unique_key_with_combination_of_ip_port', (ipAddr: IpAddr) => [ipAddr.key], {unique: true})
@Index('unique_ip_and_port', (ipaddr: IpAddr) => [ipaddr.ip, ipaddr.port], {unique: true})
export class IpAddr {

  @PrimaryGeneratedColumn()
  id: number;

  // ip : port
  @Column()
  key: string;

  @Column()
  ip: string;

  @Column()
  port: number;

  @Column()
  validation_id: number = 0;

  @Column()
  protocols_src: number = 0;

  @Column()
  protocols_dest: number = 0;

  @Column()
  blocked: boolean = false;

  @Column({type: 'boolean'})
  to_delete = false;

  @Column({nullable: true})
  last_checked_at: Date;

  @Column()
  count_errors: number = 0;

  @Column({nullable: true})
  errors_since_at: Date = null;

  @Column()
  count_success: number = 0;

  @Column({nullable: true})
  success_since_at: Date = null;


  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;


  used: number = 0;

  success: number = 0;

  errors:number = 0;

  duration_sum: number = 0;

  duration_avg: number = 0;

  odd: number = 0;


  constructor() {
  }

  @BeforeInsert()
  @BeforeUpdate()
  _prepare() {
    if (!this.key) {
      this.key = [this.ip, this.port].join(':');
    }
  }

  addSourceProtocol(pt: ProtocolType) {
    this.protocols_src = this.protocols_src | pt;
  }

  removeSourceProtocol(pt: ProtocolType) {
    if ((this.protocols_src & pt) == pt) {
      this.protocols_src = this.protocols_src & ~pt;
    }
  }


  addProtocol(pt: ProtocolType) {
    this.protocols_dest = this.protocols_dest | pt;
  }

  removeProtocol(pt: ProtocolType) {
    this.protocols_dest = this.protocols_dest & ~pt;
  }


  supportsProtocol(p: ProtocolType): boolean {
    return (this.protocols_dest & p) == p;
  }

  supportsSourceProtocol(p: ProtocolType): boolean {
    return (this.protocols_src & p) == p;
  }

  supportsHttp(): boolean {
    return this.supportsProtocol(ProtocolType.HTTP);
  }

  supportsHttps(): boolean {
    return this.supportsProtocol(ProtocolType.HTTPS);
  }

  supportsBoth() {
    return this.supportsHttp() && this.supportsHttps();
  }


}
