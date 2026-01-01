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
  @Req() req: any,
  @Headers('x-razorpay-signature') signature: string,
) {
  console.log('webhook entered');

  const rawBody = req.body.toString();

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');
    console.log('Received signature:', signature);
    console.log('Expected signature:', expectedSignature);


  if (signature !== expectedSignature) {
    throw new UnauthorizedException('Invalid webhook signature');
  }

  const payload = JSON.parse(rawBody);
  return this.webhooksService.processRazorpayWebhook(payload);
}
}
