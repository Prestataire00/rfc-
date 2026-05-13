-- Document: ajouts pour le sprint Projets/Documents
-- Visibilité par audience + rattachement projet + métadonnées

ALTER TABLE "Document"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "projetId" TEXT,
  ADD COLUMN "visibleClient" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "visibleFormateur" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Document_projetId_idx" ON "Document"("projetId");
CREATE INDEX "Document_type_idx" ON "Document"("type");

ALTER TABLE "Document"
  ADD CONSTRAINT "Document_projetId_fkey"
  FOREIGN KEY ("projetId") REFERENCES "Projet"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
