import { prisma } from "../database";

export const getUsername = async (telegramId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: {
      telegramId: telegramId,
    },
  });
  return user?.telegramUsername || "";
};
