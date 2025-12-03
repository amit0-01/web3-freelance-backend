import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './user.entity';
import { PrismaModule } from 'src/databases/prisma.module';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), PrismaModule],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
