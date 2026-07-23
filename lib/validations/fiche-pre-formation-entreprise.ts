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

export const SOURCES_CONTACT = ["telephone", "mail", "agence", "site_internet"] as const;
export const MATERIELS_SUR_PLACE = ["salles", "videoprojecteur", "paperboard"] as const;

// Un stagiaire nominatif saisi par l'entreprise sur la fiche de besoin.
export const stagiaireSaisiSchema = z.object({
  prenom: z.string().trim().min(1, "Prénom requis"),
  nom: z.string().trim().min(1, "Nom requis"),
  email: z.string().trim().email("Email invalide"),
  dateNaissance: z.string().trim().optional().nullable(), // ISO "YYYY-MM-DD"
  sexe: z.enum(["M", "F"]).optional().nullable(),
  lieuNaissance: z.string().trim().optional().nullable(),
});
export type StagiaireSaisi = z.infer<typeof stagiaireSaisiSchema>;

// Reponses publiques au questionnaire (via token)
export const fichePreFormationEntrepriseReponseSchema = z.object({
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

  // Section 5 - Analyse des besoins (fiche papier RFC).
  // datesSouhaitees & materielSurPlace : chaînes JSON (sérialisées côté form),
  // spreadées telles quelles dans les colonnes String de la fiche.
  sourceContact: z.enum(SOURCES_CONTACT).optional().nullable(),
  natureEntreprise: z.string().optional().nullable(),
  adresseEntreprise: z.string().optional().nullable(),
  intituleFormationSouhaite: z.string().optional().nullable(),
  lieuFormationSouhaite: z.string().optional().nullable(),
  datesSouhaitees: z.string().optional(),
  besoinParticulier: z.string().optional().nullable(),
  materielSurPlace: z.string().optional(),
  observation: z.string().optional().nullable(),
});

export type FichePreFormationEntrepriseReponseData = z.infer<typeof fichePreFormationEntrepriseReponseSchema>;

// Réponse publique (via token) : identique + liste nominative des stagiaires.
// `stagiaires` n'est PAS une colonne de la fiche → schéma séparé pour ne pas
// polluer les routes admin qui spreadent les données directement dans Prisma.
export const fichePreFormationEntreprisePublicReponseSchema = fichePreFormationEntrepriseReponseSchema.extend({
  stagiaires: z.array(stagiaireSaisiSchema).optional().default([]),
});
export type FichePreFormationEntreprisePublicReponseData = z.infer<typeof fichePreFormationEntreprisePublicReponseSchema>;

// Creation/maj cote admin
export const fichePreFormationEntrepriseAdminSchema = fichePreFormationEntrepriseReponseSchema.extend({
  sessionId: z.string().cuid(),
  entrepriseId: z.string().cuid().optional().nullable(),
  destinataireNom: z.string().optional().nullable(),
  destinataireEmail: z.string().email().optional().or(z.literal("")),
  statut: z.enum(["en_attente", "envoye", "repondu", "incomplet"]).optional(),
  optionnel: z.boolean().optional(),
});
