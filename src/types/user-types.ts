import type { Friendship } from "./friendship-types";

export type CreateUser = {
  telegramId: string;
  telegramUsername: string;
};

export type UserWithFriends = {
  id: string;
  telegramId: string;
  telegramUsername: string;
  userStatus: string;
  createdAt: Date;
  initiatedFriendships: Friendship[];
  receivedFriendships: Friendship[];
};
