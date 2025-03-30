// src/jobs/jobs.module.ts
import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../databases/prisma.service';  // Import PrismaService
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { JobRepository } from './job.repository';
import { User } from 'src/user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, User])
  ], 
  controllers: [JobsController],
  providers: [JobsService, PrismaService, JobRepository],
  exports: [JobsService],  
})
export class JobsModule {}
