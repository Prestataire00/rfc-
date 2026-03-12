import { z } from "zod";

export const contactSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().min(1, "Prénom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  poste: z.string().optional(),
  type: z.enum(["client", "prospect", "stagiaire"]),
  entrepriseId: z.string().cuid().optional().nullable(),
  notes: z.string().optional(),
});

export type ContactFormData = z.infer<typeof contactSchema>;
