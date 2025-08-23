import type { Bot } from "grammy";
import type { CreateUser } from "../types";
import { M } from "../messages";
import { startKeyboard } from "../keyboards";
import { generateMainMenu } from "./user-profile-handler";
import { logger } from "../lib/logger";
import { userService } from "../services";
import { redisClient } from "../lib/redis";
import { STATES } from "../lib";

export const setupStartHandler = async (bot: Bot) => {
  bot.command("start", async (ctx) => {
    const currentState = await redisClient.get(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id))
    );

    if (currentState === STATES.FRIEND_ADD) {
      return;
    }

    logger.info(`User ${ctx.from?.id} started the bot`);
    logger.info(`Set state ${STATES.START} for ${ctx.from?.id}`);

    redisClient.set(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      STATES.START,
      "STATE"
    );

    const userData = {
      telegramId: String(ctx.from?.id),
      telegramUsername: ctx.from?.username || "",
    } as CreateUser;

    logger.info(`Creating user: ${JSON.stringify(userData)}`);
    userService.createUser(userData);

    ctx.reply(M.START, {
      parse_mode: "HTML",
      reply_markup: startKeyboard,
    });
  });

  bot.callbackQuery("start", async (ctx) => {
    await generateMainMenu(ctx);
  });
};
