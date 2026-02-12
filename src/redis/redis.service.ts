import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
    private client: Redis;

    onModuleInit() {
      const redisUrl = process.env.REDIS_URL;
    
      if (redisUrl) {
        // Production (Redis Cloud)
        this.client = new Redis(redisUrl);
      } else {
        // Local Docker Redis
        this.client = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
        });
      }
    
      this.client.on('connect', () => {
        console.log('✅ Redis connected');
      });
    
      this.client.on('error', (err) => {
        console.error('❌ Redis error', err);
      });
    }
    

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl: number) {
    return this.client.set(key, value, 'EX', ttl);
  }

  async del(key: string) {
    return this.client.del(key);
  }
}
