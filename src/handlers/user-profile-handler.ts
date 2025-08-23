import type { Bot, Context } from "grammy";
import {
  howItWorksKeyboard,
  userProfileKeyboard,
  friendshipKeyboard,
} from "../keyboards";
import { M } from "../messages";
import { logger } from "../lib";
import { generateFriendshipKey } from "../utils";
import { redisClient } from "../lib";

export const generateMainMenu = async (ctx: Context) => {
  logger.info(`User ${ctx.from?.id} opened the profile menu`);
  ctx.answerCallbackQuery();
  ctx.editMessageText(M.PROFILE, {
    parse_mode: "HTML",
    reply_markup: userProfileKeyboard,
  });
};

export const backToProfile = async (ctx: Context) => {
  logger.info(`User ${ctx.from?.id} returned to profile`);
  await generateMainMenu(ctx);
};

export const setupUserProfileHandler = async (bot: Bot) => {
  bot.callbackQuery("how-it-works", (ctx) => {
    logger.info(`User ${ctx.from?.id} requested how it works`);
    ctx.answerCallbackQuery();
    ctx.editMessageText(M.HOW_IT_WORKS, {
      parse_mode: "HTML",
      reply_markup: howItWorksKeyboard,
    });
  });

  bot.callbackQuery("understand", async (ctx) => {
    generateMainMenu(ctx);
  });
  bot.callbackQuery("get-friendship-key", async (ctx) => {
    logger.info(`User ${ctx.from?.id} requested friendship key`);
    ctx.answerCallbackQuery();

    const redisKey = redisClient.REDIS_KEYS.FRIENDSHIP(ctx.from?.id);
    const redisData = await redisClient.get(redisKey);
    let friendshipKey;

    if (redisData) {
      friendshipKey = redisData;
    } else {
      friendshipKey = generateFriendshipKey();
      await redisClient.set(redisKey, friendshipKey);
    }

    ctx.editMessageText(M.FRIENDSHIP_KEY(friendshipKey), {
      parse_mode: "HTML",
      reply_markup: friendshipKeyboard,
    });
  });

  bot.callbackQuery("back_to_profile", async (ctx) => {
    await backToProfile(ctx);
  });
};
