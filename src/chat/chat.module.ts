import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { PrismaService } from 'src/databases/prisma.service';
import { ChatController } from './chat.controller';

@Module({
  providers: [ChatGateway, ChatService, PrismaService],
  controllers : [ChatController]
})
export class ChatModule {}
