import { z } from "zod";

// Audit 2026-05-19 §2.6 : validation Zod du body de POST /api/badges/[id]/award.
// La route lit { contactIds: string[], sessionId?: string } — sessionId nullable
// côté Prisma (BadgeAward.sessionId String?).
export const badgeAwardSchema = z.object({
  contactIds: z
    .array(z.string().min(1, "contactId invalide"))
    .min(1, "contactIds requis"),
  sessionId: z.string().min(1).optional().nullable(),
});

export type BadgeAwardData = z.infer<typeof badgeAwardSchema>;
