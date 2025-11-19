import * as nodeCrypto from 'crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Polyfill must happen BEFORE anything else
if (!globalThis.crypto) {
  globalThis.crypto = {
    randomUUID: nodeCrypto.randomUUID,
    getRandomValues: (arr: any) => nodeCrypto.randomFillSync(arr),
    subtle: {} as any,
  } as any;
}


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, 
  });
  await app.listen(process.env.PORT ?? 3000,'0.0.0.0');
}
bootstrap();
