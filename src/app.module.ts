import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './jobs/jobs.module';
import { BlockchainModule } from './blockchain/blockchain.module'; 
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { Job } from './jobs/job.entity';
import { User } from './user/user.entity';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { PrismaModule } from './databases/prisma.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    JobsModule,
    BlockchainModule, 
    AuthModule, 
    UserModule,
    ChatModule,
    PrismaModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
