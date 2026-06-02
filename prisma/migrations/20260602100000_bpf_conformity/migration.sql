-- Migration : Conformité BPF Cerfa 10443*17
--
-- Ajoute les champs nécessaires pour calculer le BPF en respectant la
-- nomenclature officielle (art. R6352-22 à R6352-24 C. trav., Cerfa 10443*17) :
--   - Contact.statutProfessionnel : override l'heuristique de classement D1
--   - Formation.typeActionBpf     : ventilation D2 (11 types d'action)
--   - Table BpfCharges            : saisie manuelle des charges cadre C par exercice
--
-- À appliquer manuellement dans Supabase SQL Editor (port 5432 non
-- accessible directement). Idempotente grâce aux IF NOT EXISTS.

-- 1. Contact.statutProfessionnel
ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "statutProfessionnel" TEXT;

-- 2. Formation.typeActionBpf
ALTER TABLE "Formation"
  ADD COLUMN IF NOT EXISTS "typeActionBpf" TEXT NOT NULL DEFAULT 'adaptation';

-- 3. Table BpfCharges (cadre C — charges détaillées par exercice)
CREATE TABLE IF NOT EXISTS "BpfCharges" (
  "id"              TEXT NOT NULL,
  "annee"           INTEGER NOT NULL,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  "c1Achats"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "c2Services"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "c3AutresCharges" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "c4Impots"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "c5Salaires"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "c6Autres"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "BpfCharges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BpfCharges_annee_key" ON "BpfCharges"("annee");
