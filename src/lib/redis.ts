import Redis from "ioredis";
import type { ExpirationType } from "../types";

class RedisClient {
  private client: Redis;

  private EXPIRATION_TIMES: Record<ExpirationType, number> = {
    DEFAULT: 60 * 60 * 24,
    STATE: 60 * 60,
  };

  REDIS_KEYS = {
    FRIENDSHIP: (userId: string) => `friendship:${userId}`,
    USER_STATE: (userId: string) => `user_state:${userId}`,
  };

  constructor() {
    this.client = new Redis({
      port: Number(process.env.REDIS_PORT!),
      host: process.env.REDIS_HOST!,
    });
  }

  async set(
    key: string,
    value: string,
    expirationType: ExpirationType = "DEFAULT"
  ): Promise<void> {
    await this.client.set(
      key,
      value,
      "EX",
      this.EXPIRATION_TIMES[expirationType]
    );
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }
}

export const redisClient = new RedisClient();
