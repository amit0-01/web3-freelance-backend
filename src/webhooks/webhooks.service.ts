import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/databases/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async processRazorpayWebhook(payload: any) {
  console.log('webhooks working')
  const event = payload.event;
  
  if (event === 'payment.captured') {
    const payment = payload.payload.payment.entity;
    const jobId = payment.notes?.jobId;

    if (!jobId) {
      return { status: 'ignored', reason: 'jobId missing' };
    }

    await this.prisma.payment.updateMany({
      where: {
        jobId: Number(jobId),
        status: 'PENDING'
      },
      data: {
        status: 'RELEASED',
        transactionHash: payment.id
      }
    });

    await this.prisma.job.update({
      where: { id: Number(jobId) },
      data: {
        isPaid: true
      }
    });
  }

  if (event === 'payment.failed') {
    const payment = payload.payload.payment.entity;
    const jobId = payment.notes?.jobId;

    if (jobId) {
      await this.prisma.payment.updateMany({
        where: { jobId: Number(jobId) },
        data: { status: 'FAILED' }
      });
    }
  }

  return { status: 'ok' };
}
}
