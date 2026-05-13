-- Add projetId column to TaskList (optional)
ALTER TABLE "TaskList" ADD COLUMN "projetId" TEXT;

-- Index for efficient filtering by project
CREATE INDEX "TaskList_projetId_idx" ON "TaskList"("projetId");

-- Foreign key with SET NULL on delete (matches schema.prisma onDelete: SetNull)
ALTER TABLE "TaskList"
  ADD CONSTRAINT "TaskList_projetId_fkey"
  FOREIGN KEY ("projetId") REFERENCES "Projet"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
