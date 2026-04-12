import { z } from "zod";

export const SECTEURS_ACTIVITE = [
  "securite_privee",
  "btp",
  "sante",
  "transport",
  "industrie",
  "commerce",
  "autre",
] as const;

export const OBJECTIFS_FORMATION = [
  "renouvellement_carte_pro",
  "premiere_habilitation",
  "recyclage_annuel",
  "autre",
] as const;

// Reponses publiques au questionnaire (via token)
export const besoinClientReponseSchema = z.object({
  // Section 1
  secteurActivite: z.enum(SECTEURS_ACTIVITE).optional().nullable(),
  effectifTotal: z.coerce.number().int().min(0).optional().nullable(),
  effectifConcerne: z.coerce.number().int().min(0).optional().nullable(),

  // Section 2
  metiersStagiaires: z.string().optional().nullable(),
  contexteTravail: z.string().optional().nullable(),
  contraintesSpecifiques: z.string().optional().nullable(),

  // Section 3
  objectifPrincipal: z.enum(OBJECTIFS_FORMATION).optional().nullable(),
  objectifsClient: z.string().optional().nullable(),
  casAccidentsRecents: z.boolean().optional().default(false),
  detailsCasAccidents: z.string().optional().nullable(),
  contraintesHoraires: z.string().optional().nullable(),

  // Section 4
  aStagiairesHandicap: z.boolean().optional().default(false),
  detailsHandicap: z.string().optional().nullable(),
});

export type BesoinClientReponseData = z.infer<typeof besoinClientReponseSchema>;

// Creation/maj cote admin
export const besoinClientAdminSchema = besoinClientReponseSchema.extend({
  sessionId: z.string().cuid(),
  entrepriseId: z.string().cuid().optional().nullable(),
  destinataireNom: z.string().optional().nullable(),
  destinataireEmail: z.string().email().optional().or(z.literal("")),
  statut: z.enum(["en_attente", "envoye", "repondu", "incomplet"]).optional(),
  optionnel: z.boolean().optional(),
});
