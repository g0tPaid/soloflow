import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      connectTimeout: 2000,
      commandTimeout: 1000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    this.client.on('error', (error: unknown) => {
      this.logger.warn(`Redis error: ${error instanceof Error ? error.message : String(error)}`);
    });
    this.client.connect().catch((error: unknown) => {
      this.logger.warn(
        `Redis connection failed - cache will be unavailable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(`Redis get failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.warn(`Redis set failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Redis del failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.quit();
    } catch (error) {
      this.logger.warn(`Redis quit failed: ${error instanceof Error ? error.message : String(error)}`);
      this.client.disconnect();
    }
  }
}
