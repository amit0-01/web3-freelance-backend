import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { User } from 'src/user/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([ User])],
  providers: [PaymentService],
  controllers: [PaymentController]
})
export class PaymentModule {}
