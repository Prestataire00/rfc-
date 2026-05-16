// Schéma Zod pour la création unifiée d'un prospect (Contact + Entreprise + Demande).
// Composé à partir des champs métier minimaux des 3 entités existantes.
// Cf. docs/superpowers/specs/2026-05-16-formulaire-prospect-unifie-design.md

import { z } from "zod";

const contactSchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  poste: z.string().optional(),
});

const entrepriseNouvelleSchema = z.object({
  nom: z.string().min(1, "Raison sociale requise"),
  siret: z.string().regex(/^\d{14}$/, "SIRET = 14 chiffres").optional().or(z.literal("")),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  secteur: z.string().optional(),
  effectif: z.coerce.number().int().nonnegative().optional(),
});

const demandeSchema = z.object({
  origine: z.enum(["client", "stagiaire", "centre", "prospection"]),
  sourceContact: z.string().optional(),
  formationSouhaitee: z.string().min(1, "Formation souhaitée requise"),
  nbStagiaires: z.coerce.number().int().positive().optional(),
  datesSouhaitees: z.string().optional(),
  budgetEnvisage: z.coerce.number().nonnegative().optional(),
  modeFinancement: z.enum(["opco", "cpf", "entreprise", "personnel", "mixte", "a_definir"]).optional(),
});

const besoinsParticulierssSchema = z.object({
  handicapContraintes: z.string().optional(),
  materielSurPlace: z.string().optional(),
});

export const prospectCreationSchema = z
  .object({
    contact: contactSchema,
    entrepriseMode: z.enum(["nouvelle", "existante"]),
    entrepriseId: z.string().cuid().optional(),
    entrepriseNouvelle: entrepriseNouvelleSchema.optional(),
    demande: demandeSchema,
    besoinsParticuliers: besoinsParticulierssSchema.optional(),
    notesInternes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.entrepriseMode === "nouvelle") return !!data.entrepriseNouvelle?.nom;
      if (data.entrepriseMode === "existante") return !!data.entrepriseId;
      return false;
    },
    {
      message: "Si entreprise=nouvelle → entrepriseNouvelle.nom requis. Si entreprise=existante → entrepriseId requis.",
      path: ["entrepriseMode"],
    },
  );

export type ProspectCreationData = z.infer<typeof prospectCreationSchema>;
