import type { Bot, Context } from "grammy";
import {
  howItWorksKeyboard,
  userProfileKeyboard,
  backToProfileKeyboard,
} from "../keyboards";
import { M } from "../messages";
import { logger } from "../lib";
import { generateFriendshipKey } from "../utils";
import { redisClient, generatePaginator, STATES } from "../lib";
import { userService, FriendsPaginator } from "../services";

export const generateMainMenu = async (
  ctx: Context,
  isEditMessage: boolean = true
) => {
  logger.info(`User ${ctx.from?.id} opened the profile menu`);
  logger.info(`Set state ${STATES.USER_PROFILE} for ${ctx.from?.id}`);

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
  }

  redisClient.setState(
    redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
    {
      state: STATES.USER_PROFILE,
    },
    "STATE"
  );

  if (isEditMessage) {
    ctx.editMessageText(M.PROFILE, {
      parse_mode: "HTML",
      reply_markup: userProfileKeyboard,
    });
    return;
  }

  ctx.reply(M.PROFILE, {
    parse_mode: "HTML",
    reply_markup: userProfileKeyboard,
  });
};

export const generateFriendsMenu = async (ctx: Context) => {
  logger.info(`User ${ctx.from?.id} requested their friends list`);
  logger.info(`Set state ${STATES.USER_FRIENDS} for ${ctx.from?.id}`);

  await ctx.answerCallbackQuery();

  redisClient.setState(
    redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
    {
      state: STATES.USER_FRIENDS,
    },
    "STATE"
  );

  const userFriends = await userService.getUserFriends(String(ctx.from?.id));

  const paginator = new FriendsPaginator(
    userFriends ?? { initiatedFriendships: [], receivedFriendships: [] }
  );

  ctx.editMessageText(paginator.renderPage(), {
    parse_mode: "HTML",
    reply_markup: paginator.getKeyboard(),
  });
};

export const generateCallListMenu = async (ctx?: Context) => {
  if (ctx) {
    logger.info(`User ${ctx.from?.id} pressed call button`);
    await ctx.answerCallbackQuery();

    logger.info(`Set state ${STATES.CALL_LIST} for ${ctx.from?.id}`);
    await redisClient.setState(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      {
        state: STATES.CALL_LIST,
      },
      "STATE"
    );

    logger.info(`Generating call list for user ${ctx.from?.id}`);

    const paginator = await generatePaginator(ctx);
    paginator.setPage(1);

    await ctx.editMessageText(paginator.renderCallList(), {
      parse_mode: "HTML",
      reply_markup: paginator.getCallListKeyboard(),
    });
  } else {
    logger.info(`Generating call list without context`);

    
  }
};

export const backToProfile = async (ctx: Context) => {
  logger.info(`User ${ctx.from?.id} returned to profile`);
  await generateMainMenu(ctx);
};

export const setupUserProfileHandler = async (bot: Bot) => {
  bot.callbackQuery("how-it-works", (ctx) => {
    logger.info(`User ${ctx.from?.id} requested how it works`);
    logger.info(`Set state ${STATES.HOW_IT_WORKS} for ${ctx.from?.id}`);

    redisClient.setState(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      {
        state: STATES.HOW_IT_WORKS,
      },
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

    redisClient.setState(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      {
        state: STATES.FRIENDSHIP_KEY,
      },
      "STATE"
    );

    ctx.answerCallbackQuery();

    const redisUserKey = redisClient.REDIS_KEYS.FRIENDSHIP_USER(
      String(ctx.from?.id)
    );

    const redisData = await redisClient.get(redisUserKey);
    let friendshipKey;

    if (redisData) {
      friendshipKey = redisData;
    } else {
      friendshipKey = generateFriendshipKey();
      await redisClient.set(redisUserKey, friendshipKey);
      const redisCodeKey =
        redisClient.REDIS_KEYS.FRIENDSHIP_CODE(friendshipKey);
      await redisClient.set(redisCodeKey, String(ctx.from?.id));
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
    await generateFriendsMenu(ctx);
  });

  bot.callbackQuery("call", async (ctx) => {
    await generateCallListMenu(ctx);
  });
};
