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
});

export type ContactFormData = z.infer<typeof contactSchema>;
