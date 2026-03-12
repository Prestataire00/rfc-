import { z } from "zod";

export const formateurSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().min(1, "Prénom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  specialites: z.array(z.string()).default([]),
  tarifJournalier: z.coerce.number().positive().optional().nullable(),
  cv: z.string().optional(),
  notes: z.string().optional(),
  actif: z.boolean().optional().default(true),
});

export type FormateurFormData = z.infer<typeof formateurSchema>;
