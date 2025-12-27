import {
  Controller,
  Post,
  Req,
  Headers,
  UnauthorizedException
} from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('razorpay')
  async handleRazorpayWebhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string
  ) {
    console.log('this is working')
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return this.webhooksService.processRazorpayWebhook(req.body);
  }
}
