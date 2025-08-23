import { Bot } from "grammy";
import { logger } from "../lib";
import { M } from "../messages";
import { backToFriendList } from "../keyboards";
import { redisClient } from "../lib";
import { STATES } from "../lib";

export const setupUserFriendsHandler = async (bot: Bot) => {
  bot.callbackQuery("add-friend", async (ctx) => {
    logger.info(`User ${ctx.from?.id} requested to add a friend`);
    logger.info(`Set state ${STATES.FRIEND_ADD} for ${ctx.from?.id}`);

    ctx.answerCallbackQuery();

    redisClient.set(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      STATES.FRIEND_ADD,
      "STATE"
    );

    ctx.editMessageText(M.FRIEND_ADD_REQUEST, {
      parse_mode: "HTML",
      reply_markup: backToFriendList,
    });
  });

  bot.on("message:text", async (ctx) => {
    const currentState = await redisClient.get(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id))
    );

    if (currentState !== STATES.FRIEND_ADD) {
      return;
    }

    const friendCode = ctx.message.text;
    logger.info(`User ${ctx.from?.id} sent friend code: ${friendCode}`);

    // TODO: удалить сообщение с просьбой ввести код друга
  });
};
