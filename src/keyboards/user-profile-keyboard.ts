import { InlineKeyboard } from "grammy";

export const userProfileKeyboard = new InlineKeyboard()
  .text("Друзья 🧑‍🤝‍🧑", "user-friends")
  .text("Позвонить 📞", "call")
  .row()
  .text("Ключ дружбы 🔑", "get-friendship-key")
  .text("Как это работает❓", "how-it-works")
  .row();
