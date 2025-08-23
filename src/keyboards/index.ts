export { startKeyboard } from "./start-keyboard";
export { userProfileKeyboard } from "./user-profile-keyboard";
export { howItWorksKeyboard } from "./how-it-works-keyboard";
export { userFriendsKeyboard, backToFriendList } from "./user-friends-keyboard";

import { InlineKeyboard } from "grammy";

export const backToProfileKeyboard = new InlineKeyboard().text(
  "Назад ⬅️",
  "back-to-profile"
);
