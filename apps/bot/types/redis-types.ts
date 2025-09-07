export type ExpirationType = "DEFAULT" | "STATE" | "FRIEND_LIST";

export type FriendshipUpdate = {
  fromTelegramId: string;
  toTelegramId: string;
};
