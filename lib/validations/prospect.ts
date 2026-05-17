// Schéma Zod pour la création unifiée d'un prospect (Contact + Entreprise + Demande).
// Composé à partir des champs métier minimaux des 3 entités existantes.
// Cf. docs/superpowers/specs/2026-05-16-formulaire-prospect-unifie-design.md

import { z } from "zod";

// Types de prospect : "entreprise" | "stagiaire" | "organisme"
export const PROSPECT_TYPE_VALUES = ["entreprise", "stagiaire", "organisme"] as const;
export type ProspectType = (typeof PROSPECT_TYPE_VALUES)[number];

const contactSchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  poste: z.string().optional(),
  // "prospect" (entreprise/organisme) | "stagiaire"
  type: z.string().optional(),
});

const entrepriseNouvelleSchema = z.object({
  nom: z.string().min(1, "Raison sociale requise"),
  siret: z.string().regex(/^\d{14}$/, "SIRET = 14 chiffres").optional().or(z.literal("")),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  secteur: z.string().optional(),
  effectif: z.coerce.number().int().nonnegative().optional(),
  // Pour organisme : nature supplémentaire
  natureOrganisme: z.string().optional(),
});

const demandeSchema = z.object({
  origine: z.enum(["client", "stagiaire", "centre", "prospection"]),
  sourceContact: z.string().optional(),
  formationSouhaitee: z.string().min(1, "Formation souhaitée requise"),
  // formationId : lier à une formation du catalogue (optionnel)
  formationId: z.string().cuid().optional(),
  // description : contenu du textarea "Décrivez le besoin"
  description: z.string().optional(),
  nbStagiaires: z.coerce.number().int().positive().optional(),
  datesSouhaitees: z.string().optional(),
  budgetEnvisage: z.coerce.number().nonnegative().optional(),
  modeFinancement: z.enum(["opco", "cpf", "entreprise", "personnel", "mixte", "a_definir"]).optional(),
});

const besoinsParticulierssSchema = z.object({
  handicapContraintes: z.string().optional(),
  materielSurPlace: z.string().optional(),
});

// Stagiaire nominal rattaché à une demande entreprise — optionnel à la création.
// Si fourni : on crée N Contact(type=stagiaire) liés à l'entreprise.
// Si vide : on conserve juste demande.nbStagiaires (compteur), les noms
// seront saisis plus tard à l'inscription en session.
const stagiaireNominalSchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  telephone: z.string().optional(),
});

export const prospectCreationSchema = z
  .object({
    contact: contactSchema,
    // prospectType guide le comportement côté formulaire et back
    prospectType: z.enum(PROSPECT_TYPE_VALUES).optional().default("entreprise"),
    // Pour stagiaire : pas d'entreprise requise ; pour les autres, obligatoire
    entrepriseMode: z.enum(["nouvelle", "existante", "aucune"]),
    entrepriseId: z.string().cuid().optional(),
    entrepriseNouvelle: entrepriseNouvelleSchema.optional(),
    demande: demandeSchema,
    besoinsParticuliers: besoinsParticulierssSchema.optional(),
    notesInternes: z.string().optional(),
    // Stagiaires nominaux à rattacher à l'entreprise (uniquement pour
    // prospectType=entreprise). Ignoré pour stagiaire individuel/organisme.
    stagiaires: z.array(stagiaireNominalSchema).optional(),
  })
  .refine(
    (data) => {
      // Stagiaire → pas d'entreprise requise
      if (data.entrepriseMode === "aucune") return true;
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
