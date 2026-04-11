import { z } from "zod";

export const formationSchema = z.object({
  titre: z.string().min(1, "Titre requis"),
  description: z.string().optional(),
  duree: z.coerce.number().positive("Durée doit être positive"),
  tarif: z.coerce.number().min(0, "Tarif doit être positif ou nul"),
  niveau: z.enum(["tous", "debutant", "intermediaire", "avance"]),
  prerequis: z.string().optional(),
  objectifs: z.string().optional(),
  categorie: z.string().optional(),
  actif: z.boolean().optional().default(true),
  // Nouveaux champs
  modalite: z.enum(["presentiel", "distanciel", "mixte"]).optional().default("presentiel"),
  statut: z.enum(["brouillon", "publiee", "archivee"]).optional().default("brouillon"),
  publicCible: z.string().optional(),
  contenuProgramme: z.string().optional(),
  methodesPedagogiques: z.string().optional(),
  methodesEvaluation: z.string().optional(),
  moyensTechniques: z.string().optional(),
  accessibilite: z.string().optional(),
  indicateursResultats: z.string().optional(),
  typesFinancement: z.string().optional().default("[]"),
  dureeRecyclage: z.coerce.number().int().positive().optional().nullable(),
  certifiante: z.boolean().optional().default(false),
  codeRNCP: z.string().optional(),
  misEnAvant: z.boolean().optional().default(false),
});

export type FormationFormData = z.infer<typeof formationSchema>;

export const lieuFormationSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional().default("France"),
  salles: z.string().optional().default("[]"),
  capacite: z.coerce.number().int().positive().optional().nullable(),
  equipements: z.string().optional(),
  tarifJournee: z.coerce.number().positive().optional().nullable(),
  tarifDemiJournee: z.coerce.number().positive().optional().nullable(),
  contactNom: z.string().optional(),
  contactTelephone: z.string().optional(),
  contactEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  accessibilitePMR: z.boolean().optional().default(false),
  consignesAcces: z.string().optional(),
  infoParking: z.string().optional(),
  infoTransport: z.string().optional(),
  notes: z.string().optional(),
  actif: z.boolean().optional().default(true),
});

export type LieuFormationFormData = z.infer<typeof lieuFormationSchema>;
