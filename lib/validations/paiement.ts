import { z } from "zod";

// Audit 2026-05-19 §4.9 : schéma Zod manquant pour Paiement (pièce comptable CGI art. 286).
export const PAIEMENT_MODE_ENUM = [
  "virement",
  "cpf",
  "opco",
  "carte",
  "especes",
  "cheque",
] as const;

export const paiementSchema = z.object({
  factureId: z.string().cuid("factureId invalide"),
  montant: z.coerce.number().positive("Montant doit être positif"),
  datePaiement: z.union([z.string(), z.date()]),
  mode: z.enum(PAIEMENT_MODE_ENUM),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type PaiementData = z.infer<typeof paiementSchema>;
