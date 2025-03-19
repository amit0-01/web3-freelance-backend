// src/jobs/jobs.module.ts
import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../databases/prisma.service';  // Import PrismaService

@Module({
  imports: [],
  controllers: [JobsController],
  providers: [JobsService, PrismaService],
  exports: [JobsService],  // Export the JobsService if you need to use it elsewhere
})
export class JobsModule {}
