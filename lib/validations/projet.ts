import { z } from "zod";

export const PROJET_STATUTS = [
  "brouillon",
  "en_cours",
  "en_pause",
  "termine",
  "archive",
] as const;

export const PROJET_PRIORITES = ["basse", "normale", "haute", "critique"] as const;

export const projetCreateSchema = z.object({
  nom: z.string().min(1, "Le nom est requis").max(200),
  code: z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  statut: z.enum(PROJET_STATUTS).optional(),
  priorite: z.enum(PROJET_PRIORITES).optional(),
  dateDebut: z.string().datetime().optional().nullable(),
  dateFinPrevue: z.string().datetime().optional().nullable(),
  dateFinReelle: z.string().datetime().optional().nullable(),
  chefProjet: z.string().max(120).optional().nullable(),
  budget: z.number().nonnegative().optional().nullable(),
  objectifs: z.string().max(4000).optional().nullable(),
  livrables: z.string().max(4000).optional().nullable(),
  entrepriseId: z.string().cuid().optional().nullable(),
  formateurIds: z.array(z.string().cuid()).optional(),
});

export const projetUpdateSchema = projetCreateSchema.partial();

export type ProjetCreateInput = z.infer<typeof projetCreateSchema>;
export type ProjetUpdateInput = z.infer<typeof projetUpdateSchema>;
