// GET tâches d'un projet : retourne toutes les TaskList rattachées + leurs items,
// avec un calcul d'avancement global (% completed) et par liste.
// Sprint 1 du module Projets/Tâches.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const dynamic = "force-dynamic";

export const GET = withErrorHandlerParams<{ id: string }>(async (_req, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const projetId = ctx.params.id;

  // Vérifie que le projet existe (404 explicite plutôt que liste vide).
  const projet = await prisma.projet.findUnique({
    where: { id: projetId },
    select: { id: true, nom: true, objectifs: true },
  });
  if (!projet) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  const lists = await prisma.taskList.findMany({
    where: { projetId },
    include: {
      items: {
        orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Agrégats d'avancement
  let totalItems = 0;
  let completedItems = 0;
  const listsWithStats = lists.map((l) => {
    const total = l.items.length;
    const done = l.items.filter((i) => i.completed).length;
    totalItems += total;
    completedItems += done;
    return {
      ...l,
      stats: {
        total,
        completed: done,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
      },
    };
  });

  const globalPercent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  return NextResponse.json({
    projet,
    lists: listsWithStats,
    stats: {
      totalLists: lists.length,
      totalItems,
      completedItems,
      percent: globalPercent,
    },
  });
});
