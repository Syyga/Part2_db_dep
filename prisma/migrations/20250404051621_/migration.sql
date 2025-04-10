/*
  Warnings:

  - You are about to drop the column `userId` on the `PointHistory` table. All the data in the column will be lost.
  - Added the required column `pointId` to the `PointHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PointHistory" DROP COLUMN "userId",
ADD COLUMN     "pointId" TEXT NOT NULL;
