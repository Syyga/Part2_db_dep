-- CreateIndex
CREATE INDEX "PhotoCard_grade_genre_idx" ON "PhotoCard"("grade", "genre");

-- CreateIndex
CREATE INDEX "SaleCard_status_idx" ON "SaleCard"("status");

-- CreateIndex
CREATE INDEX "SaleCard_photoCardId_idx" ON "SaleCard"("photoCardId");
