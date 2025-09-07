import { InlineKeyboard } from "grammy";

export const userFriendsKeyboard = new InlineKeyboard()
  .text("Добавить друга ➕", "add-friend")
  .row()
  .text("Удалить друга ➖", "remove-friend")
  .row()
  .text("Назад ⬅️", "back-to-profile");

export const backToFriendList = new InlineKeyboard().text(
  "Назад ⬅️",
  "user-friends"
);

export const getFriendRequestDecisionKeyboard = (
  fromId: string,
  toId: string
) => {
  return new InlineKeyboard()
    .text("Принять ✅", `accept-friend-${fromId}-${toId}`)
    .text("Отклонить ❌", `decline-friend-${fromId}-${toId}`);
};
