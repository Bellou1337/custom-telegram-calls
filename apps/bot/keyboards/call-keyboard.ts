import { InlineKeyboard } from "grammy";

export const userIsBusyKeyboard = new InlineKeyboard().text(
  "Назад ⬅️",
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
