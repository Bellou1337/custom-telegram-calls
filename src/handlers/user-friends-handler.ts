import { Bot } from "grammy";
import { M } from "../messages";
import {
  backToFriendList,
  getFriendRequestDecisionKeyboard,
} from "../keyboards";
import { redisClient, STATES, generatePaginator, logger } from "../lib";
import {
  NotifyService,
  friendshipService,
  userService,
  FriendsPaginator,
} from "../services";
import { generateMainMenu, generateFriendsMenu } from "./user-profile-handler";
import { deleteMessage, getUsername } from "../utils";
import type { FriendshipRequest } from "../types";

export const setupUserFriendsHandler = async (bot: Bot) => {
  const notifyService = new NotifyService(bot);

  bot.callbackQuery("add-friend", async (ctx) => {
    logger.info(`User ${ctx.from?.id} requested to add a friend`);
    logger.info(`Set state ${STATES.FRIEND_ADD} for ${ctx.from?.id}`);

    await ctx.answerCallbackQuery();

    const sent = await ctx.editMessageText(M.FRIEND_ADD_REQUEST, {
      parse_mode: "HTML",
      reply_markup: backToFriendList,
    });

    let messageId: number | undefined;
    if (typeof sent === "object" && "message_id" in sent) {
      messageId = sent.message_id;
    }

    redisClient.setState(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      {
        state: STATES.FRIEND_ADD,
        messageId: messageId,
        chatId: ctx.chat?.id,
      },
      "STATE"
    );
  });

  bot.on("message:text", async (ctx) => {
    const currentState = await redisClient.getState(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id))
    );

    if (currentState?.state !== STATES.FRIEND_ADD) {
      return;
    }

    await ctx.reply(M.SEARCHING_FRIEND_BY_CODE, {
      parse_mode: "HTML",
    });

    const userCode = ctx.message.text;
    logger.info(`User ${ctx.from?.id} sent friendship code: ${userCode}`);

    const friendshipId = await redisClient.get(
      redisClient.REDIS_KEYS.FRIENDSHIP_CODE(userCode)
    );

    if (!friendshipId) {
      logger.info(`User ${ctx.from?.id} does not have a friendship code`);
      await ctx.reply(M.FRIENDSHIP_CODE_NOT_FOUND, {
        parse_mode: "HTML",
      });
      return;
    }

    if (friendshipId === String(ctx.from?.id)) {
      logger.info(`User ${ctx.from?.id} tried to add themselves as a friend`);
      await ctx.reply(M.SELF_FRIENDSHIP_CODE, {
        parse_mode: "HTML",
      });
      return;
    }

    logger.info(
      `Check existing friendship for ${friendshipId} and ${ctx.from?.id}`
    );

    const friendshipData = {
      fromTelegramId: ctx.from?.id.toString(),
      toTelegramId: friendshipId.toString(),
    } as FriendshipRequest;

    const existingFriendship = await friendshipService.checkExistingFriendship(
      friendshipData
    );

    if (existingFriendship) {
      logger.info(
        `Friendship already exists for ${ctx.from?.id} and ${friendshipId}: ${existingFriendship.status}`
      );
      ctx.reply(M.FRIENDSHIP_ALREADY_EXISTS(existingFriendship.status), {
        parse_mode: "HTML",
      });
      await deleteMessage(
        ctx,
        Number(currentState?.chatId),
        Number(currentState?.messageId)
      );
      await generateMainMenu(ctx, false);
      return;
    }

    logger.info("Creating friendship request");
    const createdFriendshipRequest =
      await friendshipService.createFriendshipRequest(friendshipData);

    if (!createdFriendshipRequest) {
      logger.error(`Failed to create friendship request`);
      await ctx.reply(M.FRIENDSHIP_REQUEST_FAILED, {
        parse_mode: "HTML",
      });
      await deleteMessage(
        ctx,
        Number(currentState?.chatId),
        Number(currentState?.messageId)
      );
      await generateMainMenu(ctx, false);
      return;
    }

    logger.info(`Sending friend add request notification to ${friendshipId}`);
    await notifyService.notifyUser(
      friendshipId,
      M.FRIEND_ADD_REQUEST_NOTIFICATION(ctx.from?.username || ""),
      getFriendRequestDecisionKeyboard(
        ctx.from?.id!.toString(),
        friendshipId.toString()
      )
    );

    await ctx.reply(M.FRIEND_ADD_REQUEST_SENT, {
      parse_mode: "HTML",
    });

    await deleteMessage(
      ctx,
      Number(currentState?.chatId),
      Number(currentState?.messageId)
    );

    logger.info(`Reset state for ${ctx.from?.id}`);

    await generateMainMenu(ctx, false);
  });

  bot.callbackQuery(/^accept-friend-(\d+)-(\d+)$/, async (ctx) => {
    const fromId = ctx.match[1];
    const toId = ctx.match[2];

    logger.info(`User ${toId} accepted friendship request from ${fromId}`);

    const fromUsername = await getUsername(fromId?.toString()!);
    const toUsername = await getUsername(toId?.toString()!);

    await friendshipService.createFriendship({
      fromTelegramId: fromId?.toString()!,
      toTelegramId: toId?.toString()!,
      fromUsername: fromUsername,
      toUsername: toUsername,
    });

    logger.info(`Change status to ACCEPTED for user ${fromId} and ${toId}`);

    await friendshipService.changeFriendshipStatus({
      fromTelegramId: fromId?.toString()!,
      toTelegramId: toId?.toString()!,
      fromUsername: fromUsername,
      toUsername: toUsername,
    });

    logger.info(`Notifying users about accepted friendship`);

    await ctx.answerCallbackQuery({
      text: M.FRIENDSHIP_REQUEST_ACCEPTED,
      show_alert: true,
    });

    await ctx.deleteMessage();

    // TODO: уведомление для пользователя который присылал заявку
  });

  bot.callbackQuery(/^friends_page_(\d+)$/, async (ctx) => {
    const page = Number(ctx.match[1]);
    logger.info(`User ${ctx.from?.id} requested friends list page ${page}`);

    const paginator = await generatePaginator(ctx);
    paginator.setPage(page);

    await ctx.editMessageText(paginator.renderPage(), {
      parse_mode: "HTML",
      reply_markup: paginator.getKeyboard(),
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^remove_friend_(\d+)$/, async (ctx) => {
    const friendId = ctx.match[1];
    logger.info(`User ${ctx.from?.id} requested to remove friend ${friendId}`);

    logger.info(`Removing friend ${friendId}`);
    await friendshipService.removeFriend({
      fromTelegramId: ctx.from?.id!.toString(),
      toTelegramId: friendId?.toString()!,
    });

    await ctx.answerCallbackQuery({
      text: M.FRIEND_REMOVED,
      show_alert: true,
    });

    logger.info(
      `Updating friend lists in cache for ${ctx.from?.id} and ${friendId}`
    );

    const paginator = await generatePaginator(ctx);
    paginator.setPage(1);

    await ctx.editMessageText(paginator.renderRemovePage(), {
      parse_mode: "HTML",
      reply_markup: paginator.getRemoveKeyboard(),
    });
  });

  bot.callbackQuery("remove-friend", async (ctx) => {
    logger.info(`User ${ctx.from?.id} wants to remove friend`);

    await ctx.answerCallbackQuery();

    logger.info(`Set state FRIEND_REMOVE for user ${ctx.from?.id}`);
    await redisClient.setState(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      STATES.FRIEND_REMOVE
    );

    const paginator = await generatePaginator(ctx);
    paginator.setPage(1);

    await ctx.editMessageText(paginator.renderRemovePage(), {
      parse_mode: "HTML",
      reply_markup: paginator.getRemoveKeyboard(),
    });

    // TODO: уведомление для пользователя которого удалили
  });

  bot.callbackQuery(/^remove_friends_page_(\d+)$/, async (ctx) => {
    const page = Number(ctx.match[1]);

    const paginator = await generatePaginator(ctx);
    paginator.setPage(page);

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(paginator.renderRemovePage(), {
      parse_mode: "HTML",
      reply_markup: paginator.getRemoveKeyboard(),
    });
  });

  bot.callbackQuery("back-to-user-friends", async (ctx) => {
    logger.info(`User ${ctx.from?.id} wants to go back to user friends`);
    await generateFriendsMenu(ctx);
  });
};
