import { z } from "zod";

export const sessionSchema = z.object({
  formationId: z.string().cuid("Formation requise"),
  formateurId: z.string().cuid().optional().nullable(),
  dateDebut: z.string().min(1, "Date de début requise"),
  dateFin: z.string().min(1, "Date de fin requise"),
  lieu: z.string().optional(),
  capaciteMax: z.coerce.number().int().positive().default(10),
  statut: z
    .enum(["planifiee", "confirmee", "en_cours", "terminee", "annulee"])
    .default("planifiee"),
  notes: z.string().optional(),
});

export type SessionFormData = z.infer<typeof sessionSchema>;
