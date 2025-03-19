// src/jobs/jobs.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../databases/prisma.service';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async getAllJobs() {
    return this.prisma.job.findMany();
  }
}
