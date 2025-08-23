import type { Bot } from "grammy";
import { M } from "../messages";
import { startKeyboard } from "../keyboards";
import { generateMainMenu } from "./user-profile-handler";
import { logger } from "../lib/logger";

export const setupStartHandler = async (bot: Bot) => {
  bot.command("start", (ctx) => {
    logger.info(`User ${ctx.from?.id} started the bot`);
    ctx.reply(M.START, {
      parse_mode: "HTML",
      reply_markup: startKeyboard,
    });
  });

  bot.callbackQuery("start", async (ctx) => {
    await generateMainMenu(ctx);
  });
};
