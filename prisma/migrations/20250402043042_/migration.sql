-- CreateTable
CREATE TABLE "MarketOffer" (
    "id" TEXT NOT NULL,
    "type" "MarketOfferType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "saleCardId" TEXT,
    "exchangeOfferId" TEXT,

    CONSTRAINT "MarketOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketOffer_saleCardId_key" ON "MarketOffer"("saleCardId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketOffer_exchangeOfferId_key" ON "MarketOffer"("exchangeOfferId");

-- CreateIndex
CREATE INDEX "MarketOffer_ownerId_idx" ON "MarketOffer"("ownerId");

-- CreateIndex
CREATE INDEX "SaleCard_sellerId_idx" ON "SaleCard"("sellerId");
