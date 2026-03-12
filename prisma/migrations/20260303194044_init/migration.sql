-- CreateTable
CREATE TABLE "Entreprise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "nom" TEXT NOT NULL,
    "secteur" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "siret" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "site" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "poste" TEXT,
    "notes" TEXT,
    "type" TEXT NOT NULL DEFAULT 'prospect',
    "entrepriseId" TEXT,
    CONSTRAINT "Contact_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Formateur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "specialites" TEXT NOT NULL DEFAULT '[]',
    "tarifJournalier" REAL,
    "cv" TEXT,
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "duree" INTEGER NOT NULL,
    "tarif" REAL NOT NULL,
    "niveau" TEXT NOT NULL DEFAULT 'tous',
    "prerequis" TEXT,
    "objectifs" TEXT,
    "categorie" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME NOT NULL,
    "lieu" TEXT,
    "capaciteMax" INTEGER NOT NULL DEFAULT 10,
    "statut" TEXT NOT NULL DEFAULT 'planifiee',
    "notes" TEXT,
    "formationId" TEXT NOT NULL,
    "formateurId" TEXT,
    CONSTRAINT "Session_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Session_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "dateInscription" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "contactId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "Inscription_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Inscription_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "numero" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "montantHT" REAL NOT NULL,
    "tauxTVA" REAL NOT NULL DEFAULT 20,
    "montantTTC" REAL NOT NULL,
    "dateEmission" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidite" DATETIME NOT NULL,
    "notes" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'brouillon',
    "entrepriseId" TEXT,
    "contactId" TEXT,
    CONSTRAINT "Devis_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Devis_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LigneDevis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "designation" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" REAL NOT NULL,
    "montant" REAL NOT NULL,
    "devisId" TEXT NOT NULL,
    CONSTRAINT "LigneDevis_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "numero" TEXT NOT NULL,
    "montantHT" REAL NOT NULL,
    "tauxTVA" REAL NOT NULL DEFAULT 20,
    "montantTTC" REAL NOT NULL,
    "dateEmission" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" DATETIME NOT NULL,
    "datePaiement" DATETIME,
    "notes" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "devisId" TEXT,
    "entrepriseId" TEXT,
    CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Facture_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Entreprise_siret_key" ON "Entreprise"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Formateur_email_key" ON "Formateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_contactId_sessionId_key" ON "Inscription"("contactId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_numero_key" ON "Devis"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");
