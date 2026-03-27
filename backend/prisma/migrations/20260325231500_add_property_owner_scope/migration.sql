-- AlterTable
ALTER TABLE "Property"
ADD COLUMN "ownerId" INTEGER;

-- AddForeignKey
ALTER TABLE "Property"
ADD CONSTRAINT "Property_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
