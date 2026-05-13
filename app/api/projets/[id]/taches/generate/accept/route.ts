// POST /api/projets/[id]/taches/generate/accept
//
// Reçoit la liste validée par l'admin (potentiellement éditée depuis le preview
// retourné par /generate) et crée :
//   - 1 nouvelle TaskList rattachée au projet
//   - N TaskItem en bulk
//
// Body : { listNom?: string; items: { titre, description?, priorite? }[] }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const dynamic = "force-dynamic";

const acceptSchema = z.object({
  listNom: z.string().min(1).max(100).optional(),
  couleur: z.string().optional(),
  items: z
    .array(
      z.object({
        titre: z.string().min(1).max(200),
        description: z.string().optional().nullable(),
        priorite: z.enum(["basse", "moyenne", "haute", "urgente"]).optional().nullable(),
      }),
    )
    .min(1, "Au moins une tâche requise"),
});

export const POST = withErrorHandlerParams<{ id: string }>(async (req: NextRequest, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const projet = await prisma.projet.findUnique({
    where: { id: ctx.params.id },
    select: { id: true },
  });
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const body = await parseBody(req, acceptSchema);

  // Création de la liste + items en une seule transaction pour l'atomicité.
  const result = await prisma.$transaction(async (tx) => {
    const list = await tx.taskList.create({
      data: {
        nom: body.listNom?.trim() || "Tâches générées par IA",
        couleur: body.couleur ?? "#9333ea", // violet par défaut pour distinguer les listes IA
        projetId: ctx.params.id,
        description: "Liste créée à partir des objectifs du projet via Claude.",
      },
    });

    await tx.taskItem.createMany({
      data: body.items.map((it, index) => ({
        listId: list.id,
        titre: it.titre.trim(),
        description: it.description?.trim() || null,
        priorite: it.priorite ?? null,
        ordre: index,
      })),
    });

    return list;
  });

  return NextResponse.json({ listId: result.id, count: body.items.length }, { status: 201 });
});
