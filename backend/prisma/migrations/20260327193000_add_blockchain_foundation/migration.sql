-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('UNSET', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "TokenizationStatus" AS ENUM ('DRAFT', 'DEPLOYED', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlockchainOperationType" AS ENUM (
  'SYNC_WALLET_KYC',
  'SET_BLOCKLIST',
  'SET_BLOCKED_COUNTRY',
  'DEPLOY_PROPERTY',
  'MINT_PROPERTY',
  'PREPARE_PRIMARY_BUY',
  'EXECUTE_PRIMARY_BUY'
);

-- CreateEnum
CREATE TYPE "BlockchainOperationStatus" AS ENUM (
  'PREPARED',
  'SUBMITTED',
  'CONFIRMED',
  'FAILED',
  'CANCELLED'
);

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "countryCode" TEXT,
ADD COLUMN "walletAddress" TEXT,
ADD COLUMN "walletStatus" "WalletStatus" NOT NULL DEFAULT 'UNSET',
ADD COLUMN "walletVerifiedAt" TIMESTAMP(3),
ADD COLUMN "kycSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Property"
ADD COLUMN "symbol" TEXT,
ADD COLUMN "contractAddress" TEXT,
ADD COLUMN "chainId" INTEGER,
ADD COLUMN "metadataUri" TEXT,
ADD COLUMN "metadataHash" TEXT,
ADD COLUMN "metadataSignature" TEXT,
ADD COLUMN "deployTxHash" TEXT,
ADD COLUMN "tokenizationStatus" "TokenizationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "treasuryWalletAddress" TEXT,
ADD COLUMN "backendOperatorWalletAddress" TEXT,
ADD COLUMN "tokenDecimals" INTEGER NOT NULL DEFAULT 18;

-- CreateTable
CREATE TABLE "BlockchainOperation" (
  "id" SERIAL NOT NULL,
  "requestId" TEXT,
  "type" "BlockchainOperationType" NOT NULL,
  "status" "BlockchainOperationStatus" NOT NULL DEFAULT 'PREPARED',
  "chainId" INTEGER,
  "propertyId" INTEGER,
  "userId" INTEGER,
  "fromWallet" TEXT,
  "toWallet" TEXT,
  "amount" TEXT,
  "price" TEXT,
  "currency" TEXT,
  "nonce" TEXT,
  "deadline" TIMESTAMP(3),
  "signature" TEXT,
  "txHash" TEXT,
  "payload" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BlockchainOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Property_contractAddress_key" ON "Property"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "BlockchainOperation_requestId_key" ON "BlockchainOperation"("requestId");

-- CreateIndex
CREATE INDEX "BlockchainOperation_propertyId_idx" ON "BlockchainOperation"("propertyId");

-- CreateIndex
CREATE INDEX "BlockchainOperation_userId_idx" ON "BlockchainOperation"("userId");

-- CreateIndex
CREATE INDEX "BlockchainOperation_type_status_idx" ON "BlockchainOperation"("type", "status");

-- AddForeignKey
ALTER TABLE "BlockchainOperation"
ADD CONSTRAINT "BlockchainOperation_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockchainOperation"
ADD CONSTRAINT "BlockchainOperation_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
