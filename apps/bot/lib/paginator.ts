import type { Context } from "grammy";
import { FriendsPaginator, userService } from "../services";

export const generatePaginator = async (ctx: Context) => {
  const userFriends = await userService.getUserFriends(String(ctx.from?.id));
  const paginator = new FriendsPaginator(
    userFriends ?? { initiatedFriendships: [], receivedFriendships: [] }
  );
  paginator.setPage(1);
  return paginator;
};
