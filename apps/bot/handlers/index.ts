import type { Bot } from "grammy";
import { setupStartHandler } from "./start-handler";
import { setupUserProfileHandler } from "./user-profile-handler";
import { setupUserFriendsHandler } from "./user-friends-handler";
import { setupCallHandler } from "./call-handler";
import { logger } from "../lib";

export const setupHandlers = async (bot: Bot) => {
  logger.info("Setting up handlers...");
  await setupStartHandler(bot);
  await setupUserProfileHandler(bot);
  await setupUserFriendsHandler(bot);
  await setupCallHandler(bot);
};
