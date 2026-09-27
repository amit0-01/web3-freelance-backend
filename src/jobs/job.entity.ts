import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column('decimal', { precision: 18, scale: 4, default: 0 }) 
  payment: number;

  @Column('timestamp', { nullable: true })
  deadline?: Date;

  @Column({ default: false })
  isPaid: boolean;

  @ManyToOne(() => User, (user) => user.jobs, { nullable: false })
  @JoinColumn({ name: 'employerId' })
  employer: User;

  // Freelancer (Job Accepter)
  @ManyToOne(() => User, (user) => user.jobs, { nullable: true })
  @JoinColumn({ name: 'freelancerId' }) 
  freelancer?: User;
}
