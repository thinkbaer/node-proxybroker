import * as _ from "lodash";
import {Entity} from "typeorm/decorator/entity/Entity";
import {
  AfterLoad,AfterUpdate,AfterInsert,
  BeforeInsert, BeforeUpdate, Column, CreateDateColumn, PrimaryColumn, PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import {Index} from "typeorm/decorator/Index";

@Entity()
@Index("unique_fetchjob_key", (ipAddr: Job) => [ipAddr.key], {unique: true})
@Index("unique_fetchjob_name_and_type", (ipaddr: Job) => [ipaddr.name, ipaddr.type], {unique: true})
export class Job {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  key: string;

  @Column()
  name: string;

  @Column({nullable: true})
  type: string;

  @Column({ nullable: true})
  data: string;

  @Column({type: "boolean"})
  active: boolean;

  @Column({type: "boolean"})
  enabled: boolean;

  @Column({nullable: true})
  last_state_id: number = null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;




  @BeforeInsert()
  bi() {
    if (!this.key) {
      this.key = [this.name, this.type].join(':')
    }
    if (this.data) {
      this.data = JSON.stringify(this.data);
    }
  }


  @BeforeUpdate()
  bu() {
    if (!this.key) {
      this.key = [this.name, this.type].join(':')
    }
    if (this.data) {
      this.data = JSON.stringify(this.data);
    }
  }


  @AfterInsert()
  ai() {
    if (_.isString(this.data)) {
      this.data = JSON.parse(this.data);
    }
  }


  @AfterUpdate()
  au() {
    if (_.isString(this.data)) {
      this.data = JSON.parse(this.data);
    }
  }


  @AfterLoad()
  al() {
    if (_.isString(this.data)) {
      this.data = JSON.parse(this.data);
    }
  }
}
