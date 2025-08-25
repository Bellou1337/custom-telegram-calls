import Redis from "ioredis";
import { prisma } from "../database";
import type { ExpirationType, UserState, UserWithFriends } from "../types";

class RedisClient {
  private client: Redis;

  private EXPIRATION_TIMES: Record<ExpirationType, number> = {
    DEFAULT: 60 * 60 * 24,
    STATE: 60 * 60,
    FRIEND_LIST: 60 * 60 * 24 * 7,
  };

  REDIS_KEYS = {
    FRIENDSHIP_USER: (userId: string) => `friendship_user:${userId}`,
    FRIENDSHIP_CODE: (code: string) => `friendship_code:${code}`,
    USER_STATE: (userId: string) => `user_state:${userId}`,
    USER_FRIEND_LIST: (userId: string) => `user_friend_list:${userId}`,
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

  async setState(
    key: string,
    value: Object,
    expirationType: ExpirationType = "DEFAULT"
  ): Promise<void> {
    await this.client.set(
      key,
      JSON.stringify(value),
      "EX",
      this.EXPIRATION_TIMES[expirationType]
    );
  }

  async getState(key: string): Promise<UserState | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getFriendList(key: string): Promise<UserWithFriends | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setFriendList(
    key: string,
    value: UserWithFriends | null
  ): Promise<void> {
    await this.client.set(
      key,
      JSON.stringify(value),
      "EX",
      this.EXPIRATION_TIMES.FRIEND_LIST
    );
  }

  async updateFriendList(fromTelegramId: string, toTelegramId: string) {
    const initiatorFriends = await prisma.user.findUnique({
      where: {
        telegramId: fromTelegramId,
      },
      include: {
        initiatedFriendships: true,
        receivedFriendships: true,
      },
    });

    const recipientFriends = await prisma.user.findUnique({
      where: {
        telegramId: toTelegramId,
      },
      include: {
        initiatedFriendships: true,
        receivedFriendships: true,
      },
    });

    await this.setFriendList(
      this.REDIS_KEYS.USER_FRIEND_LIST(fromTelegramId),
      initiatorFriends
    );

    await this.setFriendList(
      this.REDIS_KEYS.USER_FRIEND_LIST(toTelegramId),
      recipientFriends
    );
  }
}

export const redisClient = new RedisClient();
