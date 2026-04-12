import { z } from "zod";

export const NIVEAUX_SCOLAIRES = ["sans_diplome", "cap", "bac", "bac+2", "bac+3", "bac+5", "autre"] as const;
export const NIVEAUX_PREREQUIS = ["debutant", "intermediaire", "avance", "expert"] as const;

// Reponse publique au questionnaire (via token)
export const besoinStagiaireReponseSchema = z.object({
  // Section 1 - Identification (maj des champs Contact si fournis)
  dateNaissance: z.string().optional().nullable(), // ISO date string
  numeroSecuriteSociale: z.string().optional().nullable(),
  numeroPasseportPrevention: z.string().optional().nullable(),

  // Section 2 - Prerequis
  dejaSuivi: z.boolean().optional().default(false),
  dateDerniereFormation: z.string().optional().nullable(),
  niveauFormation: z.enum(NIVEAUX_SCOLAIRES).optional().nullable(),
  niveauPrerequis: z.enum(NIVEAUX_PREREQUIS).optional().nullable(),

  // Section 3 - Accessibilite & contraintes
  estRQTH: z.boolean().optional().default(false),
  detailsRQTH: z.string().optional().nullable(),
  contraintesPhysiques: z.string().optional().nullable(),
  contraintesLangue: z.string().optional().nullable(),
  contraintesAlimentaires: z.string().optional().nullable(),

  // Section 4 - Consentement
  consentementRGPD: z.boolean(),
  consentementBPF: z.boolean(),
}).refine((d) => d.consentementRGPD === true, {
  message: "Le consentement RGPD est obligatoire",
  path: ["consentementRGPD"],
});

export type BesoinStagiaireReponseData = z.infer<typeof besoinStagiaireReponseSchema>;

export const besoinStagiaireAdminSchema = z.object({
  sessionId: z.string().cuid(),
  contactId: z.string().cuid(),
  statut: z.enum(["en_attente", "envoye", "repondu", "incomplet"]).optional(),
  optionnel: z.boolean().optional(),
});
