import type { Bot, Context } from "grammy";
import {
  howItWorksKeyboard,
  userProfileKeyboard,
  backToProfileKeyboard,
  userFriendsKeyboard,
} from "../keyboards";
import { M } from "../messages";
import { logger } from "../lib";
import { generateFriendshipKey } from "../utils";
import { redisClient } from "../lib";
import { userService } from "../services";
import { STATES } from "../lib";

export const generateMainMenu = async (ctx: Context) => {
  logger.info(`User ${ctx.from?.id} opened the profile menu`);
  logger.info(`Set state ${STATES.USER_PROFILE} for ${ctx.from?.id}`);

  ctx.answerCallbackQuery();

  redisClient.set(
    redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
    STATES.USER_PROFILE,
    "STATE"
  );

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
    logger.info(`Set state ${STATES.HOW_IT_WORKS} for ${ctx.from?.id}`);

    redisClient.set(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      STATES.HOW_IT_WORKS,
      "STATE"
    );

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
    logger.info(`Set state ${STATES.FRIENDSHIP_KEY} for ${ctx.from?.id}`);

    redisClient.set(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      STATES.FRIENDSHIP_KEY,
      "STATE"
    );

    ctx.answerCallbackQuery();

    const redisKey = redisClient.REDIS_KEYS.FRIENDSHIP(String(ctx.from?.id));
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
      reply_markup: backToProfileKeyboard,
    });
  });

  bot.callbackQuery("back-to-profile", async (ctx) => {
    await backToProfile(ctx);
  });

  bot.callbackQuery("user-friends", async (ctx) => {
    logger.info(`User ${ctx.from?.id} requested their friends list`);
    logger.info(`Set state ${STATES.USER_FRIENDS} for ${ctx.from?.id}`);

    await ctx.answerCallbackQuery();

    redisClient.set(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      STATES.USER_FRIENDS,
      "STATE"
    );

    const userFriends = await userService.getUserFriends(String(ctx.from?.id));

    ctx.editMessageText(
      M.FRIENDS_LIST(
        userFriends?.initiatedFriendships.length! +
          userFriends?.receivedFriendships.length!
      ),
      {
        parse_mode: "HTML",
        reply_markup: userFriendsKeyboard,
      }
    );
  });
};
