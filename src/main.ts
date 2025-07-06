import * as nodeCrypto from 'crypto';
import { createServer, proxy } from 'aws-serverless-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express from 'express';
import { Context } from 'aws-lambda';

// Polyfill for crypto
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: nodeCrypto.randomUUID,
    getRandomValues: (arr: any) => nodeCrypto.randomFillSync(arr),
    subtle: {} as any,
  } as any;
}

let cachedServer: import('http').Server;

// 👇 Only used by Vercel
async function bootstrapServer(): Promise<import('http').Server> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  await app.init();
  expressApp.use(app.getHttpAdapter().getInstance());
  return createServer(expressApp);
}

// 👇 Used by Vercel
export default async (event: any, context: Context) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return proxy(cachedServer, event, context, 'PROMISE').promise;
};
