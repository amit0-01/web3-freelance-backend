import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobId: string;

  @Column()
  senderId: string;

  @Column()
  message: string;

  @CreateDateColumn()
  timestamp: Date;
}
