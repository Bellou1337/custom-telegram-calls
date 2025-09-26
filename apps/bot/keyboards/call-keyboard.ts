import { InlineKeyboard } from "grammy";

export const userIsBusyKeyboard = new InlineKeyboard().text(
  "Назад ⬅️",
  "back-to-call-list"
);

export const callEndedKeyboard = new InlineKeyboard().text(
  "К списку друзей 👥",
  "back-to-call-list"
);

export const acceptOrDeclineKeyboard = (fromId: string, toId: string) =>
  new InlineKeyboard()
    .text("Принять ✅", `accept-call:${fromId}:${toId}`)
    .text("Отклонить ❌", `decline-call:${fromId}:${toId}`);

export const cancelCallKeyboard = new InlineKeyboard().text(
  "Отменить звонок ❌",
  "cancel-call"
);

export const callUrl = (url: string) =>
  new InlineKeyboard().webApp("📞 Открыть звонок", url);
