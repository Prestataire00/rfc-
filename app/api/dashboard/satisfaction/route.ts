// GET /api/dashboard/satisfaction
//
// KPI satisfaction calculés en direct depuis la table Evaluation :
//   - noteMoyenne          : moyenne pondérée de toutes les notes globales
//                            (1-5) des évaluations complétées, tous types
//                            confondus. null si aucune réponse encore.
//   - noteMoyenneChaud     : idem restreint au type satisfaction_chaud
//   - noteMoyenneFroid     : idem satisfaction_froid
//   - noteMoyenneAcquis    : idem évaluation des acquis
//   - tauxReponseGlobal    : pourcentage d'évaluations envoyées qui ont
//                            été complétées (0-100). Indicateur Qualiopi.
//   - nbCompletes          : nombre total d'évaluations complétées
//   - nbTotal              : nombre total d'évaluations créées (envoyées
//                            ou en attente de réponse)
//   - tendanceJ30          : delta de la note moyenne entre les 30 derniers
//                            jours et les 30 jours précédents. Positif si
//                            ça s'améliore, négatif sinon. null si moins
//                            de 2 fenêtres exploitables.
//
// Calcul SQL léger via groupBy + aggregate. Aucune écriture, route
// idempotente, force-dynamic pour ne pas être mise en cache.

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async () => {
  const now = new Date();
  const j30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const j60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [agg, byType, totalCount, completedCount, recent30, recent60] = await Promise.all([
    // Note moyenne globale (toutes éval complètes avec note)
    prisma.evaluation.aggregate({
      where: { estComplete: true, noteGlobale: { not: null } },
      _avg: { noteGlobale: true },
      _count: { _all: true },
    }),
    // Détail par type
    prisma.evaluation.groupBy({
      by: ["type"],
      where: { estComplete: true, noteGlobale: { not: null } },
      _avg: { noteGlobale: true },
      _count: { _all: true },
    }),
    // Total évaluations créées (pour le taux de réponse)
    prisma.evaluation.count(),
    // Total évaluations complétées (vs créées)
    prisma.evaluation.count({ where: { estComplete: true } }),
    // Note moyenne 0-30 jours (tendance)
    prisma.evaluation.aggregate({
      where: { estComplete: true, noteGlobale: { not: null }, createdAt: { gte: j30 } },
      _avg: { noteGlobale: true },
      _count: { _all: true },
    }),
    // Note moyenne 30-60 jours (comparaison)
    prisma.evaluation.aggregate({
      where: {
        estComplete: true,
        noteGlobale: { not: null },
        createdAt: { gte: j60, lt: j30 },
      },
      _avg: { noteGlobale: true },
      _count: { _all: true },
    }),
  ]);

  const noteByType = Object.fromEntries(
    byType.map((row) => [row.type, { note: row._avg.noteGlobale, count: row._count._all }]),
  );

  const tendanceJ30 =
    recent30._count._all > 0 && recent60._count._all > 0
      ? Number((recent30._avg.noteGlobale ?? 0) - (recent60._avg.noteGlobale ?? 0))
      : null;

  return NextResponse.json({
    noteMoyenne: agg._avg.noteGlobale,
    noteMoyenneChaud: noteByType["satisfaction_chaud"]?.note ?? null,
    noteMoyenneFroid: noteByType["satisfaction_froid"]?.note ?? null,
    noteMoyenneAcquis: noteByType["acquis"]?.note ?? null,
    nbCompletes: completedCount,
    nbTotal: totalCount,
    tauxReponseGlobal: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
    tendanceJ30,
    nbReponses: agg._count._all,
  });
});
