// Schéma Zod pour valider la réponse JSON retournée par Claude lors de la
// génération d'un devis brouillon à partir d'une Demande qualifiée.
// Cf. docs/superpowers/specs/2026-05-16-devis-auto-ia-phase-2-design.md

import { z } from "zod";

export const aiDevisOutputSchema = z.object({
  formationId: z.string().cuid(),
  objet: z.string().min(5).max(200),
  lignes: z
    .array(
      z.object({
        designation: z.string().min(1),
        quantite: z.number().int().positive(),
        prixUnitaire: z.number().nonnegative(),
      }),
    )
    .min(1),
  rationale: z.string().max(500),
});

export type AiDevisOutput = z.infer<typeof aiDevisOutputSchema>;
