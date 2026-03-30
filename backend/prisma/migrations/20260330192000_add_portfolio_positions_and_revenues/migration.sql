-- CreateEnum
CREATE TYPE "PortfolioRevenueStatus" AS ENUM ('PROJECTED', 'PAID');

-- CreateTable
CREATE TABLE "PortfolioPosition" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "propertyId" INTEGER NOT NULL,
  "tokenAmount" TEXT NOT NULL,
  "averageTokenPrice" INTEGER NOT NULL,
  "investedTotal" INTEGER NOT NULL,
  "projectedMonthlyIncome" INTEGER NOT NULL DEFAULT 0,
  "lastPurchaseAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PortfolioPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioRevenue" (
  "id" SERIAL NOT NULL,
  "positionId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "propertyId" INTEGER NOT NULL,
  "month" TIMESTAMP(3) NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "PortfolioRevenueStatus" NOT NULL DEFAULT 'PROJECTED',
  "label" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PortfolioRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioPosition_userId_propertyId_key" ON "PortfolioPosition"("userId", "propertyId");

-- CreateIndex
CREATE INDEX "PortfolioPosition_userId_idx" ON "PortfolioPosition"("userId");

-- CreateIndex
CREATE INDEX "PortfolioPosition_propertyId_idx" ON "PortfolioPosition"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioRevenue_positionId_month_key" ON "PortfolioRevenue"("positionId", "month");

-- CreateIndex
CREATE INDEX "PortfolioRevenue_userId_month_idx" ON "PortfolioRevenue"("userId", "month");

-- CreateIndex
CREATE INDEX "PortfolioRevenue_propertyId_month_idx" ON "PortfolioRevenue"("propertyId", "month");

-- AddForeignKey
ALTER TABLE "PortfolioPosition"
ADD CONSTRAINT "PortfolioPosition_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioPosition"
ADD CONSTRAINT "PortfolioPosition_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioRevenue"
ADD CONSTRAINT "PortfolioRevenue_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "PortfolioPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioRevenue"
ADD CONSTRAINT "PortfolioRevenue_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioRevenue"
ADD CONSTRAINT "PortfolioRevenue_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
