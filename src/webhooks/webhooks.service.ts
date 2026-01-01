import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/databases/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async processRazorpayWebhook(payload: any) {
  console.log('Webhook event:', payload.event);

 try {
   const payment = payload.payload?.payment?.entity;
   if (!payment) return { status: 'ignored' };
 
   const jobId = payment.notes?.jobId;
   if (!jobId) return { status: 'ignored', reason: 'jobId missing' };
 
   if (payload.event === 'payment.authorized' || payload.event === 'payment.captured') {
     await this.prisma.payment.updateMany({
       where: { jobId: Number(jobId) },
       data: {
         status: 'RELEASED',
         transactionHash: payment.id,
       },
     });
 
     await this.prisma.job.update({
       where: { id: Number(jobId) },
       data: { isPaid: true },
     });
   }
 
   if (payload.event === 'payment.failed') {
     await this.prisma.payment.updateMany({
       where: { jobId: Number(jobId) },
       data: { status: 'FAILED' },
     });
   }
 
   return { status: 'ok' };
 } catch (error:any) {
  console.error('Error processing webhook:', error);
  return { status: 'error', error: error.message };
 }
}

}
