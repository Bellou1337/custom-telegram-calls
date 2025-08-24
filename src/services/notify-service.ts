import type { Bot } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";

export class NotifyService {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  async notifyUser(
    userId: string,
    message: string,
    replyMarkup?: InlineKeyboardMarkup
  ) {
    await this.bot.api.sendMessage(userId, message, {
      parse_mode: "HTML",
      ...(replyMarkup && { reply_markup: replyMarkup }),
    });
  }
}
