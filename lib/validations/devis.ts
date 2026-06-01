import { z } from "zod";

export const ligneDevisSchema = z.object({
  id: z.string().optional(),
  designation: z.string().min(1, "Désignation requise"),
  quantite: z.coerce.number().int().positive("Quantité doit être positive"),
  prixUnitaire: z.coerce.number().nonnegative("Prix doit être positif ou nul"),
  montant: z.coerce.number(),
});

// Audit 2026-05-19 §4.8 : alignement Zod ↔ Prisma — statuts Devis officiels.
export const DEVIS_STATUT_ENUM = [
  "brouillon",
  "envoye",
  "signe",
  "refuse",
  "expire",
] as const;

export const devisSchema = z
  .object({
    // Modifiable depuis le formulaire d'édition. Unicité garantie par
    // @unique côté Prisma — P2002 intercepté dans la route PUT pour un 409 explicite.
    numero: z.string().min(1, "Numéro requis").max(50, "Numéro trop long").optional(),
    objet: z.string().min(1, "Objet requis"),
    dateValidite: z.string().min(1, "Date de validité requise"),
    tauxTVA: z.coerce.number().default(20),
    notes: z.string().optional().nullable(),
    entrepriseId: z.string().optional().nullable(),
    contactId: z.string().optional().nullable(),
    // Rattachement projet (bilatéralité projet ↔ devis)
    projetId: z.string().optional().nullable(),
    // Audit 2026-05-19 §4.8 : alignement Zod ↔ Prisma
    // (statut, dateSigne, signatureUrl présents en base).
    statut: z.enum(DEVIS_STATUT_ENUM).optional().default("brouillon"),
    dateSigne: z.union([z.string(), z.date()]).optional().nullable(),
    signatureUrl: z.string().optional().nullable(),
    lignes: z.array(ligneDevisSchema).min(1, "Au moins une ligne requise"),
  })
  .refine((data) => data.entrepriseId || data.contactId, {
    message: "Un client (entreprise ou contact) est requis",
    path: ["entrepriseId"],
  });

export type DevisFormData = z.infer<typeof devisSchema>;
export type LigneDevisFormData = z.infer<typeof ligneDevisSchema>;
