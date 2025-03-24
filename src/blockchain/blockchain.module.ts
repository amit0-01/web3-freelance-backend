import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { Job } from '../jobs/job.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PrismaService } from '../databases/prisma.service';


@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  controllers: [BlockchainController],
  providers: [BlockchainService,PrismaService],
})
export class BlockchainModule {}
