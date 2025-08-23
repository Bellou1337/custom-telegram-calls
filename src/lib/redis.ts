import Redis from "ioredis";

class RedisClient {
  private client: Redis;
  private DEFAULT_EXPIRATION = 60 * 60 * 24; // 1 day
  REDIS_KEYS = {
    FRIENDSHIP: (userId: number) => `friendship:${userId}`,
  };

  constructor() {
    this.client = new Redis({
      port: Number(process.env.REDIS_PORT!),
      host: process.env.REDIS_HOST!,
    });
  }

  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value, "EX", this.DEFAULT_EXPIRATION);
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }
}

export const redisClient = new RedisClient();
