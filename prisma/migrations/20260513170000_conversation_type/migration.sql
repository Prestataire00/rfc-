-- AlterTable: add type column with default value (compatible with existing rows)
ALTER TABLE "Conversation" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'direct_formateur';

-- Pour les conversations existantes liées à une session, on présume que
-- c'était déjà un groupe session (sessionId != NULL → session_group).
UPDATE "Conversation" SET "type" = 'session_group' WHERE "sessionId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Conversation_type_idx" ON "Conversation"("type");
