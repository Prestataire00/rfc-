import { z } from "zod";

export const avancerEtapeSchema = z.object({
  toEtape: z.string().min(1).max(50),
  notes: z.string().max(500).optional(),
});

export const createTaskSchema = z.object({
  etape: z.string().min(1).max(50),
  titre: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
});

export const patchTaskSchema = z.object({
  completed: z.boolean().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  titre: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  etape: z.string().min(1).max(50).optional(),
});
