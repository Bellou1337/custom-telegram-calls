import type { Bot } from "grammy";
import { generatePaginator, logger, STATES, redisClient } from "../lib";
import { userService, NotifyService } from "../services";
import { M } from "../messages";
import { getUsername } from "../utils";
import {
  userIsBusyKeyboard,
  acceptOrDeclineKeyboard,
  cancelCallKeyboard,
  notifyOkKeyboard,
} from "../keyboards";
import { generateCallListMenu } from "./user-profile-handler";
import { producer, TOPICS, createConsumer } from "@app/kafka";
import { callUrl } from "../keyboards/call-url";

const callTimers = new Map<string, NodeJS.Timeout>();

export const setupCallHandler = async (bot: Bot) => {
  const notifyService = new NotifyService(bot);
  const callUrlsConsumer = createConsumer("call-urls-consumer");
  callUrlsConsumer.connect();

  bot.callbackQuery(/^call_friends_page_(\d+)$/, async (ctx) => {
    const page = Number(ctx.match[1]);
    const paginator = await generatePaginator(ctx);
    paginator.setPage(page);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(paginator.renderCallList(), {
      parse_mode: "HTML",
      reply_markup: paginator.getCallListKeyboard(),
    });
  });

  bot.callbackQuery(/^call_friend_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const friendId = ctx.match[1];
    const timerId = `${ctx.from?.id}:${friendId}`;
    logger.info(`User ${ctx.from.id} want to call friend ${friendId}`);

    const userIsBusy = await userService.isUserInCall(
      friendId?.toString() || ""
    );

    const friendUsername = await getUsername(friendId?.toString() || "");
    const callerUsername = await getUsername(ctx.from.id.toString() || "");

    if (userIsBusy) {
      await ctx.editMessageText(M.USER_BUSY(friendUsername), {
        parse_mode: "HTML",
        reply_markup: userIsBusyKeyboard,
      });
      return;
    }

    await userService.updateUserStatus(ctx.from.id.toString(), "BUSY");

    await ctx.editMessageText(M.CALLING_AWAIT, {
      parse_mode: "HTML",
      reply_markup: cancelCallKeyboard,
    });

    logger.info(
      `Notifying user ${friendId} about incoming call from ${ctx.from.id}`
    );

    const sent = await notifyService.notifyUser(
      friendId?.toString() || "",
      M.CALL_REQUEST(callerUsername),
      acceptOrDeclineKeyboard(
        ctx.from.id.toString(),
        friendId?.toString() || ""
      )
    );

    logger.info(
      `Setting call status to PENDING for ${ctx.from.id} -> ${friendId}`
    );
    await redisClient.set(
      redisClient.REDIS_KEYS.CALL_STATUS(
        ctx.from.id.toString(),
        friendId?.toString() || ""
      ),
      "PENDING",
      "STATE"
    );

    logger.info(`Set state ${STATES.CALLING} for ${ctx.from.id}`);
    await redisClient.setState(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id)),
      {
        state: STATES.CALLING,
        toUserId: friendId?.toString() || "",
        toMessageId: sent.message_id.toString(),
        toChatId: sent.chat.id.toString(),
        messageId: ctx.callbackQuery.message?.message_id.toString() || "",
        chatId: ctx.callbackQuery.message?.chat.id.toString() || "",
      },
      "STATE"
    );

    const timer = setTimeout(async () => {
      logger.info(`Checking call status for ${ctx.from.id} -> ${friendId}`);
      const callStatus = await redisClient.get(
        redisClient.REDIS_KEYS.CALL_STATUS(
          ctx.from.id.toString(),
          friendId?.toString() || ""
        )
      );

      if (callStatus === "PENDING") {
        logger.info(`Edit message for ${friendId} - call timed out`);
        await bot.api.editMessageText(
          friendId?.toString() || "",
          sent.message_id,
          M.MISSED_CALL_FROM(callerUsername),
          {
            parse_mode: "HTML",
            reply_markup: notifyOkKeyboard,
          }
        );

        logger.info(`Edit message for ${ctx.from.id} - no answer`);
        await ctx.editMessageText(M.CALL_NO_ANSWER, {
          reply_markup: userIsBusyKeyboard,
          parse_mode: "HTML",
        });

        logger.info(`Update user ${ctx.from.id} status to ACTIVE`);
        await userService.updateUserStatus(ctx.from.id.toString(), "ACTIVE");

        logger.info(
          `Delete redis key for call status ${ctx.from.id} -> ${friendId}`
        );
        await redisClient.del(
          redisClient.REDIS_KEYS.CALL_STATUS(
            ctx.from.id.toString(),
            friendId?.toString() || ""
          )
        );
      }
    }, 40_000);

    callTimers.set(timerId, timer);
  });

  bot.callbackQuery("back-to-call-list", async (ctx) => {
    await generateCallListMenu(ctx);
  });
  bot.callbackQuery("cancel-call", async (ctx) => {
    const state = await redisClient.getState(
      redisClient.REDIS_KEYS.USER_STATE(String(ctx.from?.id))
    );

    logger.info(
      `Delete redis key for call status ${ctx.from.id} -> ${state?.toUserId}`
    );
    await redisClient.del(
      redisClient.REDIS_KEYS.CALL_STATUS(
        ctx.from.id.toString(),
        state?.toUserId || ""
      )
    );

    logger.info(
      `Delete message ${state?.toMessageId} for user ${state?.toUserId}`
    );

    await bot.api.deleteMessage(
      Number(state?.toChatId),
      Number(state?.toMessageId)
    );

    clearTimeout(
      callTimers.get(`${ctx.from?.id}:${state?.toUserId}`) as NodeJS.Timeout
    );

    await userService.updateUserStatus(ctx.from.id.toString(), "ACTIVE");

    await generateCallListMenu(ctx);
  });

  bot.callbackQuery(/^decline-call:(\d+):(\d+)$/, async (ctx) => {
    logger.info(`User ${ctx.from?.id} declined the call`);
    await ctx.answerCallbackQuery(M.CALL_DECLINE_YOU);
    await ctx.deleteMessage();

    logger.info(
      `Delete redis key for call status ${ctx.match[1]} -> ${ctx.match[2]}`
    );
    await redisClient.del(
      redisClient.REDIS_KEYS.CALL_STATUS(
        ctx.match[1]?.toString() || "",
        ctx.match[2]?.toString() || ""
      )
    );

    const state = await redisClient.getState(
      redisClient.REDIS_KEYS.USER_STATE(ctx.match[1]?.toString() || "")
    );

    await bot.api.editMessageText(
      Number(state?.chatId),
      Number(state?.messageId),
      M.CALL_DECLINE(ctx.from.username || ""),
      {
        parse_mode: "HTML",
        reply_markup: userIsBusyKeyboard,
      }
    );

    logger.info(`Update user ${ctx.match[1]} status to ACTIVE`);
    await userService.updateUserStatus(
      ctx.match[1]?.toString() || "",
      "ACTIVE"
    );

    logger.info(`Clearing timer for ${ctx.match[1]} -> ${ctx.from?.id}`);
    clearTimeout(
      callTimers.get(`${ctx.match[1]}:${ctx.from?.id}`) as NodeJS.Timeout
    );
  });

  bot.callbackQuery(/^accept-call:(\d+):(\d+)$/, async (ctx) => {
    logger.info(`User ${ctx.from?.id} accepted the call`);
    await ctx.answerCallbackQuery();

    logger.info(
      `Delete redis key for call status ${ctx.match[1]} -> ${ctx.match[2]}`
    );
    await redisClient.del(
      redisClient.REDIS_KEYS.CALL_STATUS(
        ctx.match[1]?.toString() || "",
        ctx.match[2]?.toString() || ""
      )
    );

    logger.info(`Clearing timer for ${ctx.match[1]} -> ${ctx.from?.id}`);
    clearTimeout(
      callTimers.get(`${ctx.match[1]}:${ctx.from?.id}`) as NodeJS.Timeout
    );

    const msg = ctx.callbackQuery?.message;
    await redisClient.setState(
      redisClient.REDIS_KEYS.USER_STATE(ctx.from!.id.toString()),
      {
        chatId: msg?.chat?.id,
        messageId: msg?.message_id,
      }
    );

    const callerState = await redisClient.getState(
      redisClient.REDIS_KEYS.USER_STATE(ctx.match[1]?.toString() || "")
    );

    await bot.api.editMessageText(
      Number(callerState?.chatId),
      Number(callerState?.messageId),
      M.GENERATE_CALL_URL,
      {
        parse_mode: "HTML",
        reply_markup: callUrl,
      }
    );

    await ctx.editMessageText(M.GENERATE_CALL_URL, {
      parse_mode: "HTML",
      reply_markup: callUrl,
    });

    logger.info("Producing call event to Kafka");
    await producer.send({
      topic: TOPICS.CALL_EVENTS,
      messages: [
        {
          key: `${ctx.match[1]}_${ctx.match[2]}_${Date.now()}`,
          value: JSON.stringify({
            type: "CALL_STARTED",
            callerId: ctx.match[2],
            calleeId: ctx.match[1],
            timestamp: Date.now(),
          }),
        },
      ],
    });
  });

  await callUrlsConsumer.subscribe({
    topics: [TOPICS.CALL_URLS],
    fromBeginning: true,
  });

  await callUrlsConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value?.toString() || "{}");
        logger.info(`Get telegram url: ${data?.telegramUrl}`);

        const callerState = await redisClient.getState(
          redisClient.REDIS_KEYS.USER_STATE(data.callerId)
        );
        const calleeState = await redisClient.getState(
          redisClient.REDIS_KEYS.USER_STATE(data.calleeId)
        );

        console.log(data);

        await bot.api.editMessageText(
          Number(callerState!.chatId),
          Number(callerState!.messageId),
          M.CALL_URL(data.telegramUrl),
          {
            parse_mode: "HTML",
            reply_markup: callUrl,
          }
        );

        await bot.api.editMessageText(
          Number(calleeState!.chatId),
          Number(calleeState!.messageId),
          M.CALL_URL(data.telegramUrl),
          {
            parse_mode: "HTML",
            reply_markup: callUrl,
          }
        );
      } catch (error) {
        logger.error(
          `Error processing message in topic ${topic}, partition ${partition}: ${
            (error as Error).message
          }`
        );
      }
    },
  });
};
