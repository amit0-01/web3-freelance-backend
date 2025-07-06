import * as nodeCrypto from 'crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express, { Express } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

// ✅ Setup Express server
const server: Express = express();

// ✅ Polyfill for global crypto
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: nodeCrypto.randomUUID,
    getRandomValues: (arr: any) => nodeCrypto.randomFillSync(arr),
    subtle: {} as any,
  } as any;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  await app.init(); // ❗ Do NOT call `listen` — Vercel handles this
}
bootstrap();

// ✅ Vercel needs this as the default export
export default server;
