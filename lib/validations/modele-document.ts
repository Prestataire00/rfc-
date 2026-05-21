// Schemas Zod pour la feature "Generation de modeles de documents par IA".
//  - modeleDocumentGenerateSchema : requete envoyee a l'IA (description libre)
//  - modeleDocumentAiOutputSchema : structure JSON attendue en retour de Claude
//  - modeleDocumentSaveSchema     : payload de creation / edition du CRUD

import { z } from "zod";

export const modeleDocumentGenerateSchema = z.object({
  description: z.string().min(10, "Decrivez le document en quelques mots (10 caracteres minimum)."),
});

const variableSchema = z.object({
  nom: z.string().min(1),
  description: z.string().min(1),
});

export const modeleDocumentAiOutputSchema = z.object({
  titre: z.string().min(1),
  introduction: z.string().default(""),
  corps: z.string().min(1),
  mentions: z.string().default(""),
  variables: z.array(variableSchema).default([]),
});

export const modeleDocumentSaveSchema = z.object({
  nom: z.string().min(1, "Le nom du modele est requis."),
  description: z.string().optional(),
  titre: z.string().min(1, "Le titre est requis."),
  introduction: z.string().optional(),
  corps: z.string().min(1, "Le corps du document est requis."),
  mentions: z.string().optional(),
  variables: z.array(variableSchema).optional(),
});

export type ModeleDocumentGenerate = z.infer<typeof modeleDocumentGenerateSchema>;
export type ModeleDocumentAiOutput = z.infer<typeof modeleDocumentAiOutputSchema>;
export type ModeleDocumentSave = z.infer<typeof modeleDocumentSaveSchema>;
export type ModeleDocumentVariable = z.infer<typeof variableSchema>;
