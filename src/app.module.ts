import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './jobs/jobs.module';
import { BlockchainModule } from './blockchain/blockchain.module'; 
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './jobs/job.entity';
import { User } from './user/user.entity';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { VideoCallGateway } from './video-call/video-call.gateway';
import { VideoCallService } from './video-call/video-call.service';
import { VideoCallModule } from './video-call/video-call.module';
import { PaymentModule } from './payment/payment.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RedisModule } from './redis/redis.module';
import { ContractService } from './common/contract/contract.service';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const isProduction = process.env.NODE_ENV === 'production';
    
        return {
          type: 'postgres',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT, 10),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: true,
          autoLoadEntities: true,
    
          ssl: isProduction,
          extra: isProduction
            ? {
                ssl: {
                  rejectUnauthorized: false,
                },
              }
            : {},
        };
      },
    }),    
    JobsModule,
    BlockchainModule, 
    AuthModule, 
    UserModule,
    ChatModule,
    VideoCallModule,
    TypeOrmModule.forFeature([User, Job]),
    PaymentModule,
    ChatbotModule,
    WebhooksModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService, VideoCallGateway, VideoCallService, ContractService],
})
export class AppModule {}
