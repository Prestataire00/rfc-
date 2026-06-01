-- Rend la fiche pré-formation indépendante d'une Session.
-- La fiche devient le point d'entrée du flux commercial : elle est créée
-- à la naissance du prospect (Demande/BesoinFormation) et alimente
-- ensuite Devis → Contrat → Session → Facture.
--
-- Changements :
--   1. sessionId devient nullable (la session peut ne pas exister encore)
--   2. nouvel ID demandeId : rattachement direct à la Demande source
--   3. nouvel ID formationId : permet de connaître la formation demandée
--      même sans session
--   4. la FK sessionId passe de CASCADE à SET NULL (suppression session
--      ne doit pas supprimer la fiche qui a sa propre vie)
--   5. la FK contactId de FichePreFormationStagiaire reste CASCADE
--      (la fiche stagiaire est indissociable du contact)
--
-- Tables impactées : BesoinClient (FichePreFormationEntreprise),
--                    BesoinStagiaire (FichePreFormationStagiaire).

-- ============== FichePreFormationEntreprise (BesoinClient) ==============

-- Drop la FK CASCADE existante sur sessionId
ALTER TABLE "BesoinClient" DROP CONSTRAINT IF EXISTS "BesoinClient_sessionId_fkey";

-- Rend sessionId nullable
ALTER TABLE "BesoinClient" ALTER COLUMN "sessionId" DROP NOT NULL;

-- Recrée la FK en SET NULL
ALTER TABLE "BesoinClient"
  ADD CONSTRAINT "BesoinClient_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Ajoute demandeId
ALTER TABLE "BesoinClient" ADD COLUMN "demandeId" TEXT;
ALTER TABLE "BesoinClient"
  ADD CONSTRAINT "BesoinClient_demandeId_fkey"
  FOREIGN KEY ("demandeId") REFERENCES "BesoinFormation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Ajoute formationId
ALTER TABLE "BesoinClient" ADD COLUMN "formationId" TEXT;
ALTER TABLE "BesoinClient"
  ADD CONSTRAINT "BesoinClient_formationId_fkey"
  FOREIGN KEY ("formationId") REFERENCES "Formation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index
CREATE INDEX "BesoinClient_demandeId_idx" ON "BesoinClient"("demandeId");
CREATE INDEX "BesoinClient_formationId_idx" ON "BesoinClient"("formationId");

-- ============== FichePreFormationStagiaire (BesoinStagiaire) ==============

-- Drop la FK CASCADE existante sur sessionId
ALTER TABLE "BesoinStagiaire" DROP CONSTRAINT IF EXISTS "BesoinStagiaire_sessionId_fkey";

-- Rend sessionId nullable
ALTER TABLE "BesoinStagiaire" ALTER COLUMN "sessionId" DROP NOT NULL;

-- Recrée la FK en SET NULL
ALTER TABLE "BesoinStagiaire"
  ADD CONSTRAINT "BesoinStagiaire_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Ajoute demandeId
ALTER TABLE "BesoinStagiaire" ADD COLUMN "demandeId" TEXT;
ALTER TABLE "BesoinStagiaire"
  ADD CONSTRAINT "BesoinStagiaire_demandeId_fkey"
  FOREIGN KEY ("demandeId") REFERENCES "BesoinFormation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Ajoute formationId
ALTER TABLE "BesoinStagiaire" ADD COLUMN "formationId" TEXT;
ALTER TABLE "BesoinStagiaire"
  ADD CONSTRAINT "BesoinStagiaire_formationId_fkey"
  FOREIGN KEY ("formationId") REFERENCES "Formation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index
CREATE INDEX "BesoinStagiaire_demandeId_idx" ON "BesoinStagiaire"("demandeId");
CREATE INDEX "BesoinStagiaire_formationId_idx" ON "BesoinStagiaire"("formationId");
