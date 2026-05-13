// POST /api/task-items : créer un nouvel item dans une liste.
// L'ordre est auto-incrémenté en plaçant le nouvel item en fin de liste.
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  listId: z.string().min(1),
  titre: z.string().min(1, "Titre requis"),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priorite: z.enum(["basse", "moyenne", "haute", "urgente"]).optional().nullable(),
  userId: z.string().optional().nullable(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);

  // Vérifie que la liste existe (404 explicite plutôt que erreur FK Prisma générique)
  const list = await prisma.taskList.findUnique({ where: { id: body.listId }, select: { id: true } });
  if (!list) return NextResponse.json({ error: "Liste introuvable" }, { status: 404 });

  // Auto-incrément de l'ordre : place le nouvel item en fin de liste
  const maxOrdre = await prisma.taskItem.aggregate({
    where: { listId: body.listId },
    _max: { ordre: true },
  });
  const nextOrdre = (maxOrdre._max.ordre ?? -1) + 1;

  const item = await prisma.taskItem.create({
    data: {
      listId: body.listId,
      titre: body.titre,
      description: body.description ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      priorite: body.priorite ?? null,
      userId: body.userId ?? null,
      ordre: nextOrdre,
    },
  });

  return NextResponse.json(item, { status: 201 });
});
