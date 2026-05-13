// GET /api/formateur/taches : tâches du formateur connecté, groupées par projet.
//
// Périmètre : tâches où le formateur est assigné directement (TaskItem.userId)
// OU tâches sur un projet où le formateur est dans ProjetFormateur.
// Retourne aussi le count des commentaires par tâche (pour badge UI).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "formateur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = session.user.id;
  const formateurId = (session.user as { formateurId?: string | null }).formateurId;

  // Projets assignés au formateur via ProjetFormateur.
  const projetIds: string[] = [];
  if (formateurId) {
    const pfs = await prisma.projetFormateur.findMany({
      where: { formateurId },
      select: { projetId: true },
    });
    pfs.forEach((p) => projetIds.push(p.projetId));
  }

  // TaskList visibles : soit rattachées à un projet du formateur, soit qui
  // contiennent au moins une tâche assignée au formateur (cas direct).
  const lists = await prisma.taskList.findMany({
    where: {
      OR: [
        ...(projetIds.length > 0 ? [{ projetId: { in: projetIds } }] : []),
        { items: { some: { userId } } },
      ],
    },
    include: {
      projet: { select: { id: true, nom: true } },
      items: {
        include: { _count: { select: { comments: true } } },
        orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Sur chaque liste, on identifie les tâches qui concernent ce formateur :
  // - tâche assignée directement (userId match) → "mine"
  // - tâche sur un projet où je suis assigné → "project" (visible mais non assignée)
  const enriched = lists.map((l) => {
    const items = l.items.map((item) => ({
      ...item,
      audience: (item.userId === userId ? "mine" : "project") as "mine" | "project",
    }));
    const total = items.length;
    const completed = items.filter((i) => i.completed).length;
    const mineCount = items.filter((i) => i.audience === "mine").length;
    return {
      ...l,
      items,
      stats: {
        total,
        completed,
        mine: mineCount,
        percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      },
    };
  });

  // Stats globales pour la page (mes tâches à faire vs total visibles).
  const allItems = enriched.flatMap((l) => l.items);
  const stats = {
    totalLists: enriched.length,
    totalItems: allItems.length,
    completedItems: allItems.filter((i) => i.completed).length,
    myItems: allItems.filter((i) => i.audience === "mine").length,
    myPending: allItems.filter((i) => i.audience === "mine" && !i.completed).length,
  };

  return NextResponse.json({ lists: enriched, stats });
});
