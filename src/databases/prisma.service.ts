// src/database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

let globalPrisma: PrismaClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // ✅ Reuse PrismaClient in serverless environments
    if (!globalPrisma) {
      globalPrisma = new PrismaClient();
    }
    super();
    Object.assign(this, globalPrisma);
  }

  async onModuleInit() {
    await this.$connect();
    console.log('Prisma DB connected (via cached client)');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
