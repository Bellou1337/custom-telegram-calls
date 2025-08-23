import { prisma } from "../database";
import type { CreateUser, UserWithFriends } from "../types/user-types";
import { logger } from "../lib";

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
    return await prisma.user.findUnique({
      where: { telegramId: userTelegramId },
      include: { initiatedFriendships: true, receivedFriendships: true },
    });
  };
}

export const userService = new UserService();
