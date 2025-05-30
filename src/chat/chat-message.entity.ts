import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

// chat-message.entity.ts
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
