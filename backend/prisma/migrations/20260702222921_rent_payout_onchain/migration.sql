-- AlterEnum
ALTER TYPE "BlockchainOperationType" ADD VALUE 'RENT_PAYOUT';

-- DropIndex
DROP INDEX "BlockchainOperation_propertyId_idx";

-- DropIndex
DROP INDEX "BlockchainOperation_type_status_idx";

-- DropIndex
DROP INDEX "BlockchainOperation_userId_idx";

-- AlterTable
ALTER TABLE "BlockchainOperation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PortfolioPosition" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PortfolioRevenue" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "txHash" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "_KeyPointToProperty" ADD CONSTRAINT "_KeyPointToProperty_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_KeyPointToProperty_AB_unique";
