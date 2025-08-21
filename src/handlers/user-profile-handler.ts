import type { Bot, Context } from "grammy";
import {
  howItWorksKeyboard,
  userProfileKeyboard,
  friendshipKeyboard,
} from "../keyboards";
import { M } from "../messages";
import { logger } from "../lib";
import { generateFriendshipKey } from "../utils";

export const generateMainMenu = (ctx: Context) => {
  logger.info(`User ${ctx.from?.id} opened the profile menu`);
  ctx.answerCallbackQuery();
  ctx.editMessageText(M.PROFILE, {
    parse_mode: "HTML",
    reply_markup: userProfileKeyboard,
  });
};

export const backToProfile = (ctx: Context) => {
  logger.info(`User ${ctx.from?.id} returned to profile`);
  generateMainMenu(ctx);
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

  bot.callbackQuery("understand", (ctx) => {
    generateMainMenu(ctx);
  });

  bot.callbackQuery("get-friendship-key", (ctx) => {
    logger.info(`User ${ctx.from?.id} requested friendship key`);
    ctx.answerCallbackQuery();
    const friendshipKey = generateFriendshipKey();
    ctx.editMessageText(M.FRIENDSHIP_KEY(friendshipKey), {
      parse_mode: "HTML",
      reply_markup: friendshipKeyboard,
    });
  });

  bot.callbackQuery("back_to_profile", (ctx) => {
    backToProfile(ctx);
  });
};
