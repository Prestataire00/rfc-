export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role === "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sessions des 6 derniers mois pour ne pas tout charger.
  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const sessions = await prisma.session.findMany({
    where: { dateDebut: { gte: since } },
    select: {
      id: true,
      etape: true,
      etapeMajAt: true,
      dateDebut: true,
      dateFin: true,
      statut: true,
      formation: { select: { id: true, titre: true } },
      formateur: { select: { id: true, nom: true, prenom: true } },
      _count: { select: { inscriptions: true } },
    },
    orderBy: [{ etapeMajAt: "desc" }, { dateDebut: "asc" }],
    take: 500,
  });

  // Comptage des tâches non complétées par session
  const taskCounts = await prisma.sessionTask.groupBy({
    by: ["sessionId"],
    where: {
      sessionId: { in: sessions.map((s) => s.id) },
      completed: false,
    },
    _count: { id: true },
  });
  const pendingByIds = new Map(
    taskCounts.map((t) => [t.sessionId, t._count.id]),
  );

  const cards = sessions.map((s) => ({
    ...s,
    pendingTasksCount: pendingByIds.get(s.id) ?? 0,
  }));

  return NextResponse.json({ cards });
});
