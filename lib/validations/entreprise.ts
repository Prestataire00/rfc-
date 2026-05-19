import { z } from "zod";

// Audit 2026-05-19 §4.8 : alignement Zod ↔ Prisma (typeEntreprise officiel BPF).
export const TYPE_ENTREPRISE_ENUM = ["TPE", "PME", "ETI", "GE"] as const;

export const entrepriseSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  secteur: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  siret: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  telephone: z.string().optional(),
  site: z.string().optional(),
  notes: z.string().optional(),
  // Audit 2026-05-19 §4.8 : alignement Zod ↔ Prisma (effectif Int?, typeEntreprise String?).
  effectif: z.coerce.number().int().nonnegative().optional().nullable(),
  typeEntreprise: z.enum(TYPE_ENTREPRISE_ENUM).optional().nullable(),
});

export type EntrepriseFormData = z.infer<typeof entrepriseSchema>;
