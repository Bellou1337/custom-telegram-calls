export type Friendship = {
  id: string;
  initiatorTelegramId: string;
  recipientTelegramId: string;
  createdAt: Date;
};

export type FriendshipRequest = {
  fromTelegramId: string;
  toTelegramId: string;
  fromUsername: string;
  toUsername: string;
};

export type FriendshipRequestDb = {
  id: string;
  fromTelegramId: string;
  toTelegramId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RemoveFriendship = {
  fromTelegramId: string;
  toTelegramId: string;
};
