import { z } from "zod";

// Audit 2026-05-19 §4.9 : exposition explicite du schéma Zod pour LieuFormation.
// Reprend tous les champs Prisma de model LieuFormation (cf prisma/schema.prisma:208).
// Champs optionnels suivent la nullabilité Prisma (Type? → optional).
export const lieuFormationSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  adresse: z.string().optional().nullable(),
  codePostal: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  pays: z.string().optional().default("France"),
  salles: z.string().optional().default("[]"),
  capacite: z.coerce.number().int().positive().optional().nullable(),
  equipements: z.string().optional().nullable(),
  tarifJournee: z.coerce.number().positive().optional().nullable(),
  tarifDemiJournee: z.coerce.number().positive().optional().nullable(),
  contactNom: z.string().optional().nullable(),
  contactTelephone: z.string().optional().nullable(),
  contactEmail: z.string().email("Email invalide").optional().nullable().or(z.literal("")),
  accessibilitePMR: z.boolean().optional().default(false),
  consignesAcces: z.string().optional().nullable(),
  infoParking: z.string().optional().nullable(),
  infoTransport: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  actif: z.boolean().optional().default(true),
});

export type LieuFormationData = z.infer<typeof lieuFormationSchema>;
