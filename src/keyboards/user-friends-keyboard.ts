import { InlineKeyboard } from "grammy";

export const userFriendsKeyboard = new InlineKeyboard()
  .text("Добавить друга ➕", "add-friend")
  .row()
  .text("Назад ⬅️", "back-to-profile");

export const backToFriendList = new InlineKeyboard().text(
  "Назад ⬅️",
  "user-friends"
);
