/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,photoCardId]` on the table `UserPhotoCard` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserPhotoCard_ownerId_photoCardId_key" ON "UserPhotoCard"("ownerId", "photoCardId");
