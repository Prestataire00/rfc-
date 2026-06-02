import { z } from "zod";

export const contactSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().min(1, "Prénom requis"),
  email: z.string().min(1, "Email requis").email("Email invalide"),
  telephone: z.string().optional().nullable(),
  poste: z.string().optional().nullable(),
  type: z.enum(["client", "prospect", "stagiaire"]),
  entrepriseId: z.string().cuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Donnees stagiaire (Qualiopi / BPF / Passeport Prevention)
  dateNaissance: z.union([z.string(), z.date()]).optional().nullable(),
  numeroSecuriteSociale: z.string().optional().nullable(),
  numeroPasseportPrevention: z.string().optional().nullable(),
  besoinsAdaptation: z.string().optional().nullable(),
  niveauFormation: z.string().optional().nullable(),
  // Champs ajoutes pour la fiche d'inscription individuelle papier
  sexe: z.enum(["M", "F"]).optional().nullable(),
  lieuNaissance: z.string().optional().nullable(),
  pays: z.string().optional().nullable(),
  adressePerso: z.string().optional().nullable(),
  codePostalPerso: z.string().optional().nullable(),
  villePerso: z.string().optional().nullable(),
  numeroCartePro: z.string().optional().nullable(),
  numeroFranceTravail: z.string().optional().nullable(),
  diplomeObtenu: z.string().optional().nullable(),
  // Statut professionnel BPF (cadre D1 Cerfa 10443*17). Override l'heuristique
  // de catégorisation salarié/demandeur/particulier basée sur entrepriseId.
  statutProfessionnel: z
    .enum([
      "salarie",
      "demandeur_emploi",
      "particulier",
      "contrat_pro",
      "apprenti",
      "travailleur_non_salarie",
      "autre",
    ])
    .optional()
    .nullable(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
