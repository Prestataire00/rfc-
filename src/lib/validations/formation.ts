import { z } from "zod";

export const formationSchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères"),
  description: z.string().optional(),
  objectives: z.string().optional(),
  program: z.string().optional(),
  durationHours: z.coerce.number().int().positive("La durée doit être positive"),
  price: z.coerce.number().positive("Le prix doit être positif"),
  category: z.enum([
    "BUREAUTIQUE",
    "INFORMATIQUE",
    "MANAGEMENT",
    "LANGUES",
    "SECURITE",
    "REGLEMENTAIRE",
    "SOFT_SKILLS",
    "AUTRE",
  ]),
  prerequisites: z.string().optional(),
  certificationName: z.string().optional(),
  certificationBody: z.string().optional(),
  isActive: z.coerce.boolean().default(true),
});

export const sessionSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    modality: z.enum(["PRESENTIEL", "DISTANCIEL", "MIXTE"]),
    location: z.string().optional(),
    maxParticipants: z.coerce.number().int().positive().default(12),
    minParticipants: z.coerce.number().int().positive().default(1),
    formateurId: z.string().optional(),
    trainerCost: z.coerce.number().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "La date de fin doit être après la date de début",
    path: ["endDate"],
  });

export const enrollmentSchema = z.object({
  stagiaireId: z.string().min(1, "Le stagiaire est requis"),
  origin: z.enum(["INDIVIDUEL", "ENTREPRISE", "CENTRE"]).default("CENTRE"),
  clientId: z.string().optional(),
  notes: z.string().optional(),
});

export type FormationInput = z.infer<typeof formationSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
