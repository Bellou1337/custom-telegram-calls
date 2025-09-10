import { InlineKeyboard } from "grammy";

export const callUrl = (url: string) =>
  new InlineKeyboard().webApp("📞 Открыть звонок", url);
