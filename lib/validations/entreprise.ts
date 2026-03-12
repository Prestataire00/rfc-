import { z } from "zod";

export const entrepriseSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  secteur: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  siret: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  telephone: z.string().optional(),
  site: z.string().optional(),
  notes: z.string().optional(),
});

export type EntrepriseFormData = z.infer<typeof entrepriseSchema>;
