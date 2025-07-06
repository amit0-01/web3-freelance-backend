import * as nodeCrypto from 'crypto';
import { createServer, proxy } from 'aws-serverless-express';
import { Handler, Context } from 'aws-lambda';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import express from 'express';

// Polyfill for crypto
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: nodeCrypto.randomUUID,
    getRandomValues: (arr: any) => nodeCrypto.randomFillSync(arr),
    subtle: {} as any,
  } as any;
}

let cachedServer: import('http').Server;

// 👇 Used for local dev
async function bootstrapLocal() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}

// 👇 Used for AWS Lambda
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

// 👇 Only run app.listen() in local dev mode
if (!process.env.LAMBDA_TASK_ROOT) {
  bootstrapLocal();
}

// 👇 Exported for serverless runtime
export const handler: Handler = async (event: any, context: Context) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return proxy(cachedServer, event, context, 'PROMISE').promise;
};
