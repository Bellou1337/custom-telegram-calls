import type { Context } from "grammy";
import { logger } from "../lib";

export const deleteMessage = async (
  ctx: Context,
  chatId: number,
  messageId: number
) => {
  try {
    await ctx.api.deleteMessage(chatId, messageId);
  } catch (error) {
    logger.error(
      `Failed to delete message ${messageId} in chat ${chatId}: ${
        error as Error
      }`
    );
  }
};
