import { prisma } from "../database";
import { redisClient } from "../lib";
import type {
  FriendshipRequest,
  FriendshipRequestDb,
  RemoveFriendship,
} from "../types";
import { userService } from "./user-service";

class FriendshipService {
  async createFriendshipRequest(
    friendshipData: FriendshipRequest
  ): Promise<FriendshipRequestDb> {
    const createFriendshipRq = await prisma.friendshipRequest.create({
      data: {
        fromTelegramId: friendshipData.fromTelegramId,
        toTelegramId: friendshipData.toTelegramId,
      },
    });

    return createFriendshipRq;
  }

  async checkExistingFriendship(
    friendshipData: FriendshipRequest
  ): Promise<FriendshipRequestDb | null> {
    const existingFriendship = (await prisma.friendshipRequest.findFirst({
      where: {
        OR: [
          {
            fromTelegramId: friendshipData.fromTelegramId,
            toTelegramId: friendshipData.toTelegramId,
          },
          {
            fromTelegramId: friendshipData.toTelegramId,
            toTelegramId: friendshipData.fromTelegramId,
          },
        ],
      },
    })) as FriendshipRequestDb | null;

    return existingFriendship;
  }

  async createFriendship(friendshipData: FriendshipRequest): Promise<void> {
    await prisma.friendship.create({
      data: {
        initiatorTelegramId: friendshipData.fromTelegramId,
        recipientTelegramId: friendshipData.toTelegramId,
        initiatorUsername: friendshipData.fromUsername,
        recipientUsername: friendshipData.toUsername,
      },
    });

    await redisClient.updateFriendList(
      friendshipData.fromTelegramId,
      friendshipData.toTelegramId
    );
  }

  async changeFriendshipStatus(
    friendshipData: FriendshipRequest
  ): Promise<void> {
    const friendshipRequest = await prisma.friendshipRequest.findFirst({
      where: {
        fromTelegramId: friendshipData.fromTelegramId,
        toTelegramId: friendshipData.toTelegramId,
      },
    });

    await prisma.friendshipRequest.update({
      where: {
        id: friendshipRequest?.id!,
      },
      data: {
        status: "ACCEPTED",
      },
    });
  }

  async removeFriend(friendshipData: RemoveFriendship): Promise<void> {
    const friendshipRq = await prisma.friendshipRequest.findFirst({
      where: {
        OR: [
          {
            fromTelegramId: friendshipData.fromTelegramId,
            toTelegramId: friendshipData.toTelegramId,
          },
          {
            fromTelegramId: friendshipData.toTelegramId,
            toTelegramId: friendshipData.fromTelegramId,
          },
        ],
      },
    });

    await prisma.friendshipRequest.delete({
      where: {
        id: friendshipRq?.id!,
      },
    });

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          {
            initiatorTelegramId: friendshipData.fromTelegramId,
            recipientTelegramId: friendshipData.toTelegramId,
          },
          {
            initiatorTelegramId: friendshipData.toTelegramId,
            recipientTelegramId: friendshipData.fromTelegramId,
          },
        ],
      },
    });

    await prisma.friendship.delete({
      where: {
        id: friendship?.id!,
      },
    });

    await redisClient.updateFriendList(
      friendshipData.fromTelegramId,
      friendshipData.toTelegramId
    );
  }

  async declineFriendshipRequest(
    fromTelegramId: string,
    toTelegramId: string
  ): Promise<void> {
    const friendshipRq = await prisma.friendshipRequest.findFirst({
      where: {
        fromTelegramId: fromTelegramId,
        toTelegramId: toTelegramId,
      },
    });

    await prisma.friendshipRequest.delete({
      where: {
        id: friendshipRq?.id!,
      },
    });
  }
}

export const friendshipService = new FriendshipService();
