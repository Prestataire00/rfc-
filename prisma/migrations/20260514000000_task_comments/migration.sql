-- Commentaires riches sur les tâches (TaskItem)
-- contentHtml stocke du HTML sanitized côté serveur (isomorphic-dompurify)
CREATE TABLE "TaskComment" (
  "id"          TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "taskId"      TEXT NOT NULL,
  "authorId"    TEXT NOT NULL,
  "contentHtml" TEXT NOT NULL,

  CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");
CREATE INDEX "TaskComment_authorId_idx" ON "TaskComment"("authorId");

ALTER TABLE "TaskComment"
  ADD CONSTRAINT "TaskComment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "TaskItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskComment"
  ADD CONSTRAINT "TaskComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
