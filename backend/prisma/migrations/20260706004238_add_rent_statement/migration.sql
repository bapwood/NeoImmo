-- CreateTable
CREATE TABLE "RentStatement" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "rentCollected" INTEGER NOT NULL,
    "occupancyRatePct" DOUBLE PRECISION NOT NULL,
    "nonRecoverableCharges" INTEGER NOT NULL DEFAULT 0,
    "propertyTaxMonthly" INTEGER NOT NULL DEFAULT 0,
    "insuranceCosts" INTEGER NOT NULL DEFAULT 0,
    "managementFee" INTEGER NOT NULL DEFAULT 0,
    "maintenanceCost" INTEGER NOT NULL DEFAULT 0,
    "blockchainFees" INTEGER NOT NULL DEFAULT 0,
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "netDistributable" INTEGER NOT NULL,
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RentStatement_propertyId_month_key" ON "RentStatement"("propertyId", "month");

-- AddForeignKey
ALTER TABLE "RentStatement" ADD CONSTRAINT "RentStatement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
