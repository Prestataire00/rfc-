-- CreateEnum
CREATE TYPE "FormationCategory" AS ENUM ('BUREAUTIQUE', 'INFORMATIQUE', 'MANAGEMENT', 'LANGUES', 'SECURITE', 'REGLEMENTAIRE', 'SOFT_SKILLS', 'AUTRE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANIFIEE', 'CONFIRMEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "SessionModality" AS ENUM ('PRESENTIEL', 'DISTANCIEL', 'MIXTE');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('INSCRIT', 'CONFIRME', 'PRESENT', 'ABSENT', 'ANNULE');

-- CreateEnum
CREATE TYPE "EnrollmentOrigin" AS ENUM ('INDIVIDUEL', 'ENTREPRISE', 'CENTRE');

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "objectives" TEXT,
    "program" TEXT,
    "durationHours" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" "FormationCategory" NOT NULL DEFAULT 'AUTRE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "certificationName" TEXT,
    "certificationBody" TEXT,
    "prerequisites" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionFormation" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "modality" "SessionModality" NOT NULL DEFAULT 'PRESENTIEL',
    "location" TEXT,
    "maxParticipants" INTEGER NOT NULL DEFAULT 12,
    "minParticipants" INTEGER NOT NULL DEFAULT 1,
    "formateurId" TEXT,
    "trainerCost" DECIMAL(10,2),
    "status" "SessionStatus" NOT NULL DEFAULT 'PLANIFIEE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionFormation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "stagiaireId" TEXT NOT NULL,
    "origin" "EnrollmentOrigin" NOT NULL DEFAULT 'INDIVIDUEL',
    "clientId" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'INSCRIT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionFormation_formationId_idx" ON "SessionFormation"("formationId");

-- CreateIndex
CREATE INDEX "SessionFormation_formateurId_idx" ON "SessionFormation"("formateurId");

-- CreateIndex
CREATE INDEX "SessionFormation_startDate_idx" ON "SessionFormation"("startDate");

-- CreateIndex
CREATE INDEX "SessionFormation_status_idx" ON "SessionFormation"("status");

-- CreateIndex
CREATE INDEX "Enrollment_sessionId_idx" ON "Enrollment"("sessionId");

-- CreateIndex
CREATE INDEX "Enrollment_stagiaireId_idx" ON "Enrollment"("stagiaireId");

-- CreateIndex
CREATE INDEX "Enrollment_clientId_idx" ON "Enrollment"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_sessionId_stagiaireId_key" ON "Enrollment"("sessionId", "stagiaireId");

-- AddForeignKey
ALTER TABLE "SessionFormation" ADD CONSTRAINT "SessionFormation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFormation" ADD CONSTRAINT "SessionFormation_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionFormation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_stagiaireId_fkey" FOREIGN KEY ("stagiaireId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
