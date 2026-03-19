import { z } from "zod";

export const ligneDevisSchema = z.object({
  id: z.string().optional(),
  designation: z.string().min(1, "Désignation requise"),
  quantite: z.coerce.number().int().positive("Quantité doit être positive"),
  prixUnitaire: z.coerce.number().nonnegative("Prix doit être positif ou nul"),
  montant: z.coerce.number(),
});

export const devisSchema = z
  .object({
    objet: z.string().min(1, "Objet requis"),
    dateValidite: z.string().min(1, "Date de validité requise"),
    tauxTVA: z.coerce.number().default(20),
    notes: z.string().optional().nullable(),
    entrepriseId: z.string().optional().nullable(),
    contactId: z.string().optional().nullable(),
    lignes: z.array(ligneDevisSchema).min(1, "Au moins une ligne requise"),
  })
  .refine((data) => data.entrepriseId || data.contactId, {
    message: "Un client (entreprise ou contact) est requis",
    path: ["entrepriseId"],
  });

export type DevisFormData = z.infer<typeof devisSchema>;
export type LigneDevisFormData = z.infer<typeof ligneDevisSchema>;
