import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('razorpay/connect')
  async connectRazorpay(@Req() req) {
    const userId = req.user.id;
    return this.paymentService.connectRazorpay(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('razorpay/status')
  async checkRazorpayStatus(@Req() req) {
    const userId = req.user.id;
    return this.paymentService.checkRazorpayStatus(userId);
  }
}
