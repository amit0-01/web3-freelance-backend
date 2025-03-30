import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  // Use DECIMAL for precise financial calculations
  @Column('decimal', { precision: 18, scale: 4, default: 0 }) 
  payment: number;

  @Column('timestamp', { nullable: true })
  deadline?: Date;

  @Column({ default: false })
  isPaid: boolean;

  // Employer (Job Poster)
  @ManyToOne(() => User, (user) => user.jobs, { nullable: false })
  @JoinColumn({ name: 'employerId' }) // ✅ Explicitly define the column
  employer: User;

  // Freelancer (Job Accepter)
  @ManyToOne(() => User, (user) => user.jobs, { nullable: true })
  @JoinColumn({ name: 'freelancerId' }) // ✅ Explicitly define the column
  freelancer?: User;
}
