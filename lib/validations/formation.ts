import { z } from "zod";

export const formationSchema = z.object({
  titre: z.string().min(1, "Titre requis"),
  description: z.string().optional(),
  duree: z.coerce.number().int().positive("Durée doit être positive"),
  tarif: z.coerce.number().positive("Tarif doit être positif"),
  niveau: z.enum(["tous", "debutant", "intermediaire", "avance"]),
  prerequis: z.string().optional(),
  objectifs: z.string().optional(),
  categorie: z.string().optional(),
  actif: z.boolean().optional().default(true),
});

export type FormationFormData = z.infer<typeof formationSchema>;
