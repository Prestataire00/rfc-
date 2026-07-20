import { z } from "zod";
import { INSCRIPTION_STATUTS } from "@/lib/constants";

// Audit 2026-05-19 §4.9 : schéma Zod manquant pour Inscription (preuve Qualiopi).
// Statuts dérivés de lib/constants.ts pour garantir cohérence label/clé.
const INSCRIPTION_STATUT_KEYS = Object.keys(INSCRIPTION_STATUTS) as [
  keyof typeof INSCRIPTION_STATUTS,
  ...Array<keyof typeof INSCRIPTION_STATUTS>,
];

export const inscriptionSchema = z.object({
  sessionId: z.string().cuid("sessionId invalide"),
  contactId: z.string().cuid("contactId invalide"),
  statut: z.enum(INSCRIPTION_STATUT_KEYS).optional().default("en_attente"),
  dateInscription: z.union([z.string(), z.date()]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type InscriptionData = z.infer<typeof inscriptionSchema>;

// Remplacement d'un stagiaire indisponible par un autre.
// Soit un contact existant (contactId), soit un nouveau à créer (newContact).
export const remplacerStagiaireSchema = z
  .object({
    contactId: z.string().cuid("contactId invalide").optional(),
    newContact: z
      .object({
        prenom: z.string().trim().min(1, "Prénom requis"),
        nom: z.string().trim().min(1, "Nom requis"),
        email: z.string().trim().email("Email invalide"),
        dateNaissance: z.string().trim().optional().nullable(),
        sexe: z.enum(["M", "F"]).optional().nullable(),
        lieuNaissance: z.string().trim().optional().nullable(),
      })
      .optional(),
  })
  .refine((d) => !!d.contactId || !!d.newContact, {
    message: "Fournir un contact existant (contactId) ou les infos d'un nouveau (newContact)",
  });

export type RemplacerStagiaireData = z.infer<typeof remplacerStagiaireSchema>;
