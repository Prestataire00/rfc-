-- CreateTable
CREATE TABLE "Projet" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "priorite" TEXT NOT NULL DEFAULT 'normale',
    "dateDebut" TIMESTAMP(3),
    "dateFinPrevue" TIMESTAMP(3),
    "dateFinReelle" TIMESTAMP(3),
    "chefProjet" TEXT,
    "budget" DOUBLE PRECISION,
    "objectifs" TEXT,
    "livrables" TEXT,
    "entrepriseId" TEXT,

    CONSTRAINT "Projet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjetFormateur" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projetId" TEXT NOT NULL,
    "formateurId" TEXT NOT NULL,
    "role" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProjetFormateur_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Projet_code_key" ON "Projet"("code");

-- CreateIndex
CREATE INDEX "Projet_statut_idx" ON "Projet"("statut");

-- CreateIndex
CREATE INDEX "Projet_entrepriseId_idx" ON "Projet"("entrepriseId");

-- CreateIndex
CREATE INDEX "Projet_dateDebut_idx" ON "Projet"("dateDebut");

-- CreateIndex
CREATE INDEX "Projet_createdAt_idx" ON "Projet"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjetFormateur_projetId_formateurId_key" ON "ProjetFormateur"("projetId", "formateurId");

-- CreateIndex
CREATE INDEX "ProjetFormateur_formateurId_idx" ON "ProjetFormateur"("formateurId");

-- AlterTable: Session.projetId
ALTER TABLE "Session" ADD COLUMN "projetId" TEXT;
CREATE INDEX "Session_projetId_idx" ON "Session"("projetId");

-- AlterTable: BesoinFormation.projetId
ALTER TABLE "BesoinFormation" ADD COLUMN "projetId" TEXT;
CREATE INDEX "BesoinFormation_projetId_idx" ON "BesoinFormation"("projetId");

-- AlterTable: Devis.projetId
ALTER TABLE "Devis" ADD COLUMN "projetId" TEXT;
CREATE INDEX "Devis_projetId_idx" ON "Devis"("projetId");

-- AlterTable: Facture.projetId
ALTER TABLE "Facture" ADD COLUMN "projetId" TEXT;
CREATE INDEX "Facture_projetId_idx" ON "Facture"("projetId");

-- AddForeignKey
ALTER TABLE "Projet" ADD CONSTRAINT "Projet_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetFormateur" ADD CONSTRAINT "ProjetFormateur_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetFormateur" ADD CONSTRAINT "ProjetFormateur_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BesoinFormation" ADD CONSTRAINT "BesoinFormation_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_projetId_fkey" FOREIGN KEY ("projetId") REFERENCES "Projet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
