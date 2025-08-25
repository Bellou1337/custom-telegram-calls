export type Friend = {
  telegramId: string;
  telegramUsername: string;
};

export type UserFriends = {
  initiatedFriendships: Array<{
    recipientTelegramId: string;
    recipientUsername?: string;
  }>;
  receivedFriendships: Array<{
    initiatorTelegramId: string;
    initiatorUsername?: string;
  }>;
};
