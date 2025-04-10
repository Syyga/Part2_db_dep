/*
  Warnings:

  - A unique constraint covering the columns `[createdAt,id]` on the table `SaleCard` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SaleCard_createdAt_id_key" ON "SaleCard"("createdAt", "id");
