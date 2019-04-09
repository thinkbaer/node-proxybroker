import {Entity} from "typeorm/decorator/entity/Entity";
import {Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";


@Entity()
export class JobState {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  job_id: number;

  @Column({type: 'datetime', nullable: true})
  start: Date;

  @Column({type: 'datetime', nullable: true})
  stop: Date;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column({nullable: true})
  duration: number;

  @Column()
  count: number = 0;

  @Column()
  selected: number = 0;


  @Column()
  added: number = 0;

  @Column()
  skipped: number = 0;

  @Column()
  blocked: number = 0;

  @Column()
  updated: number = 0;

  @Column()
  validated: number = 0;

  @Column()
  broken: number = 0;

  @Column({nullable: true})
  error_code: string;

  @Column({nullable: true})
  error_message: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;


}
