import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/databases/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async processRazorpayWebhook(payload: any) {
    const event = payload.event;

    if (event === 'payment_link.paid') {
      const paymentEntity = payload.payload.payment.entity;

      const jobId = paymentEntity.notes?.jobId;

      if (!jobId) {
        return { status: 'ignored', reason: 'jobId missing' };
      }

      // Update payment status
      await this.prisma.payment.updateMany({
        where: {
          jobId: Number(jobId),
          status: 'PENDING'
        },
        data: {
          status: 'RELEASED',
          transactionHash: paymentEntity.id
        }
      });

      // Update job payment flag
      await this.prisma.job.update({
        where: { id: Number(jobId) },
        data: {
          isPaid: true
        }
      });
    }

    return { status: 'ok' };
  }
}
