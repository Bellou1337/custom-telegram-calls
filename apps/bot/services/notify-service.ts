import type { Bot } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";

export class NotifyService {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;

    this.bot.callbackQuery("notify-ok", async (ctx) => {
      await ctx.answerCallbackQuery();
      await ctx.deleteMessage();
    });
  }

  async notifyUser(
    userId: string,
    message: string,
    replyMarkup?: InlineKeyboardMarkup
  ) {
    return await this.bot.api.sendMessage(userId, message, {
      parse_mode: "HTML",
      ...(replyMarkup && { reply_markup: replyMarkup }),
    });
  }
}
