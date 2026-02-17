import { Injectable } from '@nestjs/common';
import { PrismaService } from '../databases/prisma.service';
import { BlockchainService } from '../common/blockchain/blockchain.service';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
  ) {}

  async getJobs(search?: string, category?: string) {
    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && category.toLowerCase() !== 'all') {
      whereClause.category = { has: category };
    }

    const dbJobs = await this.prisma.job.findMany({
      where: whereClause,
    });

    const contract = this.blockchainService.getContract();

    const enrichedJobs = await Promise.all(
      dbJobs.map(async (job) => {
        try {
          const onChainJob = await contract.jobs(job.id);

          return {
            ...job,
            payment: this.blockchainService.formatPayment(onChainJob.payment),
            employer: onChainJob.employer,
            freelancer: onChainJob.freelancer,
            isCompleted: onChainJob.isCompleted,
          };
        } catch (error) {
          console.error(`Error fetching job #${job.id}:`, error);
          return job;
        }
      })
    );

    return enrichedJobs;
  }
}
