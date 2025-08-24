/*
  Warnings:

  - Added the required column `initiatorUsername` to the `Friendship` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientUsername` to the `Friendship` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Friendship" ADD COLUMN     "initiatorUsername" TEXT NOT NULL,
ADD COLUMN     "recipientUsername" TEXT NOT NULL;
