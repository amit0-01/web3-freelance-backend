import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('float')
  payment: number;

  @Column('timestamp', { nullable: true })
  deadline?: Date;

  @Column({ default: false })
  isPaid: boolean;

  @ManyToOne(() => User, (user) => user.jobs)
  user: User;
}
