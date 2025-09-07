-- DropForeignKey
ALTER TABLE "public"."Friendship" DROP CONSTRAINT "Friendship_initiatorTelegramId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Friendship" DROP CONSTRAINT "Friendship_recipientTelegramId_fkey";

-- AlterTable
ALTER TABLE "public"."Friendship" ALTER COLUMN "initiatorTelegramId" SET DATA TYPE TEXT,
ALTER COLUMN "recipientTelegramId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."FriendshipRequest" ALTER COLUMN "fromTelegramId" SET DATA TYPE TEXT,
ALTER COLUMN "toTelegramId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "telegramId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_initiatorTelegramId_fkey" FOREIGN KEY ("initiatorTelegramId") REFERENCES "public"."User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Friendship" ADD CONSTRAINT "Friendship_recipientTelegramId_fkey" FOREIGN KEY ("recipientTelegramId") REFERENCES "public"."User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;
