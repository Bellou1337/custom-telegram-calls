import { prisma } from "@app/database";
import type { CreateUser, UserWithFriends, UserStatus } from "../types";
import { logger } from "../lib";
import { redisClient } from "../lib";

class UserService {
  createUser = async (user: CreateUser): Promise<void> => {
    const existingUser = await prisma.user.findUnique({
      where: { telegramId: user.telegramId },
    });

    if (existingUser) {
      logger.info(`User ${user.telegramId} already exists.`);
      return;
    }

    await prisma.user.create({
      data: user,
    });
  };

  getUserFriends = async (
    userTelegramId: string
  ): Promise<UserWithFriends | null> => {
    return (await redisClient.getFriendList(
      redisClient.REDIS_KEYS.USER_FRIEND_LIST(userTelegramId)
    )) as UserWithFriends | null;
  };

  isUserInCall = async (userTelegramId: string): Promise<boolean> => {
    logger.info(`Checking if user ${userTelegramId} is in a call.`);
    const user = await prisma.user.findUnique({
      where: { telegramId: userTelegramId },
    });

    if (!user) {
      logger.warn(`User ${userTelegramId} not found.`);
      return false;
    }

    if (user.userStatus === "BUSY") {
      return true;
    }

    return false;
  };

  updateUserStatus = async (
    userTelegramId: string,
    status: UserStatus
  ): Promise<void> => {
    await prisma.user.update({
      where: { telegramId: userTelegramId },
      data: { userStatus: status },
    });
  };
}

export const userService = new UserService();
