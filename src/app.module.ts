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


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true,
        // ssl: true,
        // extra: {
        //   ssl: {
        //     rejectUnauthorized: false,
        //   },
        // },
        // autoLoadEntities: true,
      }),
    }),
    JobsModule,
    BlockchainModule, 
    AuthModule, 
    UserModule,
    ChatModule,
    TypeOrmModule.forFeature([User, Job])
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
