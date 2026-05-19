import { z } from "zod";

// Audit 2026-05-19 §4.9 : schéma Zod manquant pour Facture (pièce comptable CGI art. 286).
export const FACTURE_STATUT_ENUM = [
  "en_attente",
  "envoyee",
  "payee",
  "en_retard",
  "annulee",
] as const;

export const factureSchema = z.object({
  montantHT: z.coerce.number().positive("Montant HT doit être positif"),
  montantTTC: z.coerce.number().positive("Montant TTC doit être positif"),
  tauxTVA: z.coerce.number().nonnegative().optional().default(20),
  dateEmission: z.union([z.string(), z.date()]).optional().nullable(),
  dateEcheance: z.union([z.string(), z.date()]),
  notes: z.string().optional().nullable(),
  statut: z.enum(FACTURE_STATUT_ENUM).optional().default("en_attente"),
  devisId: z.string().cuid().optional().nullable(),
  entrepriseId: z.string().cuid().optional().nullable(),
  projetId: z.string().cuid().optional().nullable(),
});

export type FactureData = z.infer<typeof factureSchema>;
