import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}


  // GET ALL PAYMENTS

  @Get()
  async getAllPayments() {
    return this.paymentService.getAll();
  }

  @Post(':paymentId/release')
  async releasePayment(@Param('paymentId') paymentId: string){
    return this.paymentService.releasePayment(paymentId);
  }

  // GET /payment/job/:id
  @Get('job/:id')
  async getJobDetails(@Param('id') id: number) {
    return this.paymentService.getJobDetails(id);
  }

  // @Post('release/:id')
  // async release(@Param('id', ParseIntPipe) id: number) {
  //   return this.paymentService.releasePayment(id);
  // }

  // @Post('refund/:id')
  // async refund(@Param('id', ParseIntPipe) id: number) {
  //   return this.paymentService.refundPayment(id);
  // }


  // Optionally call this endpoint to start listening to events manually
  // GET /payment/listen
  @Get('listen')
  async listenToEvents() {
    await this.paymentService.listenToEvents();
    return { message: 'Started listening to contract events' };
  }
}
