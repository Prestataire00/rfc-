-- AlterTable
ALTER TABLE "Facture" ADD COLUMN     "dernierRappelEnvoyeAt" TIMESTAMP(3),
                     ADD COLUMN     "nbRappelsEnvoyes" INTEGER NOT NULL DEFAULT 0;
