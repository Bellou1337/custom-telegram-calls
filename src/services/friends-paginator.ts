import type { Friend, UserFriends } from "../types/friends-paginator-types";
import { InlineKeyboard } from "grammy";
import { userFriendsKeyboard } from "../keyboards";
import { M } from "../messages";

export class FriendsPaginator {
  private friends: Friend[];
  private page: number = 1;
  private readonly pageSize: number = 5;

  constructor(userFriends: UserFriends) {
    this.friends = [
      ...(userFriends.initiatedFriendships?.map((f) => ({
        telegramId: f.recipientTelegramId,
        telegramUsername: f.recipientUsername ?? "",
      })) ?? []),
      ...(userFriends.receivedFriendships?.map((f) => ({
        telegramId: f.initiatorTelegramId,
        telegramUsername: f.initiatorUsername ?? "",
      })) ?? []),
    ];
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.friends.length / this.pageSize));
  }

  getCurrentPage(): number {
    return this.page;
  }

  setPage(page: number) {
    const totalPages = this.getTotalPages();
    if (page < 1) this.page = 1;
    else if (page > totalPages) this.page = totalPages;
    else this.page = page;
  }

  getPageFriends(): Friend[] {
    const start = (this.page - 1) * this.pageSize;
    return this.friends.slice(start, start + this.pageSize);
  }

  renderPage(): string {
    const totalPages = this.getTotalPages();
    const friendsOnPage = this.getPageFriends();

    if (!this.friends.length) {
      return M.EMPTY_FRIENDS_LIST;
    }

    let text = friendsOnPage
      .map(
        (f, i) =>
          `${i + 1 + (this.page - 1) * this.pageSize}. <b>@${
            f.telegramUsername || f.telegramId
          }</b>`
      )
      .join("\n\n");

    if (totalPages > 1) {
      text += M.FRIENDS_LIST_PAGE(this.page, totalPages);
    }

    return text;
  }

  getKeyboard(): InlineKeyboard {
    const totalPages = this.getTotalPages();
    const keyboard = new InlineKeyboard();

    const addRemoveRow: any[] = [];
    let backRow: any[] = [];

    userFriendsKeyboard.inline_keyboard.forEach((row) => {
      row.forEach((btn) => {
        if ("callback_data" in btn) {
          if (
            btn.callback_data === "add-friend" ||
            btn.callback_data === "remove-friend"
          ) {
            addRemoveRow.push(btn);
          } else if (btn.callback_data === "back-to-profile") {
            backRow.push(btn);
          }
        }
      });
    });

    if (addRemoveRow.length) keyboard.add(...addRemoveRow).row();

    if (totalPages > 1) {
      if (this.page > 1) keyboard.text("⬅️", `friends_page_${this.page - 1}`);
      if (this.page < totalPages)
        keyboard.text("➡️", `friends_page_${this.page + 1}`);
      keyboard.row();
    }

    if (backRow.length) keyboard.add(...backRow);

    return keyboard;
  }

  renderRemovePage(): string {
    const totalPages = this.getTotalPages();

    if (!this.friends.length) {
      return M.EMPTY_REMOVE_FRIENDS_LIST;
    }

    let text = M.FRIEND_REMOVE_INSTRUCTION;

    if (totalPages > 1) {
      text += M.FRIENDS_LIST_PAGE(this.page, totalPages);
    }

    return text;
  }

  getRemoveKeyboard(): InlineKeyboard {
    const totalPages = this.getTotalPages();
    const friendsOnPage = this.getPageFriends();
    const keyboard = new InlineKeyboard();

    friendsOnPage.forEach((friend) => {
      keyboard
        .text(
          `❌ @${friend.telegramUsername || friend.telegramId}`,
          `remove_friend_${friend.telegramId}`
        )
        .row();
    });

    if (totalPages > 1) {
      if (this.page > 1)
        keyboard.text("⬅️", `remove_friends_page_${this.page - 1}`);
      if (this.page < totalPages)
        keyboard.text("➡️", `remove_friends_page_${this.page + 1}`);
      keyboard.row();
    }

    keyboard.text("Назад ⬅️", "back-to-user-friends");

    return keyboard;
  }
}
