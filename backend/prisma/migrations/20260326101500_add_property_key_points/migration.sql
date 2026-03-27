-- CreateTable
CREATE TABLE "KeyPoint" (
  "id" SERIAL NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KeyPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_KeyPointToProperty" (
  "A" INTEGER NOT NULL,
  "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "KeyPoint_label_key" ON "KeyPoint"("label");

-- CreateIndex
CREATE UNIQUE INDEX "_KeyPointToProperty_AB_unique" ON "_KeyPointToProperty"("A", "B");

-- CreateIndex
CREATE INDEX "_KeyPointToProperty_B_index" ON "_KeyPointToProperty"("B");

-- AddForeignKey
ALTER TABLE "_KeyPointToProperty"
ADD CONSTRAINT "_KeyPointToProperty_A_fkey"
FOREIGN KEY ("A") REFERENCES "KeyPoint"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KeyPointToProperty"
ADD CONSTRAINT "_KeyPointToProperty_B_fkey"
FOREIGN KEY ("B") REFERENCES "Property"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Seed default key points
INSERT INTO "KeyPoint" ("label")
VALUES
  ('Piscine'),
  ('Lumineux'),
  ('Terrasse'),
  ('Vue dégagée'),
  ('Adresse prime'),
  ('Rénové'),
  ('Extérieur'),
  ('Stationnement')
ON CONFLICT ("label") DO NOTHING;

-- Attach key points to sample properties when they already exist
INSERT INTO "_KeyPointToProperty" ("A", "B")
SELECT kp."id", p."id"
FROM "KeyPoint" kp
JOIN "Property" p ON p."name" = 'Residence Opera Etoile'
WHERE kp."label" IN ('Adresse prime', 'Lumineux', 'Rénové')
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_KeyPointToProperty" ("A", "B")
SELECT kp."id", p."id"
FROM "KeyPoint" kp
JOIN "Property" p ON p."name" = 'Quai Saint Roch'
WHERE kp."label" IN ('Terrasse', 'Lumineux', 'Vue dégagée')
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_KeyPointToProperty" ("A", "B")
SELECT kp."id", p."id"
FROM "KeyPoint" kp
JOIN "Property" p ON p."name" = 'Villa Horizon Mediterranee'
WHERE kp."label" IN ('Piscine', 'Vue dégagée', 'Extérieur')
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_KeyPointToProperty" ("A", "B")
SELECT kp."id", p."id"
FROM "KeyPoint" kp
JOIN "Property" p ON p."name" = 'Atelier Republique'
WHERE kp."label" IN ('Lumineux', 'Rénové')
ON CONFLICT ("A", "B") DO NOTHING;

INSERT INTO "_KeyPointToProperty" ("A", "B")
SELECT kp."id", p."id"
FROM "KeyPoint" kp
JOIN "Property" p ON p."name" = 'Cours Franklin'
WHERE kp."label" IN ('Stationnement', 'Terrasse')
ON CONFLICT ("A", "B") DO NOTHING;
