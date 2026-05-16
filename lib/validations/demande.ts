import { z } from "zod";

export const SOURCE_CONTACT = ["telephone", "mail", "agence", "site_internet"] as const;
export const MATERIEL_OPTIONS = ["salles", "videoprojecteur", "paperboard"] as const;

export const demandeSchema = z.object({
  titre: z.string().min(1, "Titre requis"),
  description: z.string().optional().nullable(),
  origine: z.enum(["client", "stagiaire", "centre"]).default("client"),
  statut: z.enum(["nouveau", "qualifie", "devis_envoye", "accepte", "refuse", "archive"]).default("nouveau"),
  priorite: z.enum(["basse", "normale", "haute", "urgente"]).default("normale"),
  nbStagiaires: z.coerce.number().int().positive().optional().nullable(),
  datesSouhaitees: z.string().optional().nullable(),
  budget: z.coerce.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  entrepriseId: z.string().cuid().optional().nullable(),
  contactId: z.string().cuid().optional().nullable(),
  formationId: z.string().cuid().optional().nullable(),
  // Champs ajoutes pour l'analyse des besoins client papier
  sourceContact: z.enum(SOURCE_CONTACT).optional().nullable(),
  materielSurPlace: z.string().optional().default("[]"),
  observation: z.string().optional().nullable(),
});

export type DemandeData = z.infer<typeof demandeSchema>;
