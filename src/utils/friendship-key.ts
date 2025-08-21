import { randomBytes } from "crypto";

export const generateFriendshipKey = () => {
  return randomBytes(32).toString("hex");
};
