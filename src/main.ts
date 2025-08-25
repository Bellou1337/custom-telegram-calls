import { Bot } from "grammy";
import "dotenv/config";
import { M } from "./messages";
import { logger } from "./lib/";
import { setupHandlers } from "./handlers";

export const bot = new Bot(process.env.BOT_TOKEN!);

bot.catch((err) => {
  logger.error(`Global error: ${(err as Error).message}`);
});

const startPolling = async () => {
  try {
    // await bot.api.sendMessage(process.env.OWNER_ID!, M.BOT_STARTED);
    await setupHandlers(bot);
    await bot.start();
  } catch (error) {
    logger.error(`bot startup failed: ${(error as Error).message}`);
  }
};

await startPolling();
