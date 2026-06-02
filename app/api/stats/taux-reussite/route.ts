// GET /api/stats/taux-reussite
// Taux de réussite global + détaillé par formation pour le widget dashboard
// et tout autre KPI Qualiopi.
//
// Définition :
//   - Universe = inscriptions avec statut "presente" ET session terminée
//     (on ne compte que ce qui est validé : avoir suivi + session bouclée)
//   - Évalués = universe avec reussite IS NOT NULL
//   - Réussis = universe avec reussite = true
//
// Taux brut = réussis / universe (inclut les non-évalués comme non-réussis)
// Taux ajusté = réussis / évalués (ignore les non-évalués)
//
// La distinction est importante : un taux ajusté gonfle artificiellement si
// l'admin n'évalue que ses bons stagiaires. Le brut est plus honnête mais
// pénalisé tant que l'évaluation n'est pas faite.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "annee"; // mois | trimestre | annee | tout

  const now = new Date();
  let debut: Date;
  switch (period) {
    case "mois":
      debut = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "trimestre":
      debut = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "tout":
      debut = new Date(0);
      break;
    case "annee":
    default:
      debut = new Date(now.getFullYear(), 0, 1);
      break;
  }

  // Universe : inscriptions presente sur sessions terminée dans la période
  const inscriptions = await prisma.inscription.findMany({
    where: {
      statut: "presente",
      session: {
        statut: "terminee",
        dateFin: { gte: debut },
      },
    },
    select: {
      reussite: true,
      session: {
        select: {
          id: true,
          formation: { select: { id: true, titre: true } },
        },
      },
    },
  });

  const total = inscriptions.length;
  const reussis = inscriptions.filter((i) => i.reussite === true).length;
  const echecs = inscriptions.filter((i) => i.reussite === false).length;
  const nonEvalues = total - reussis - echecs;
  const evalues = reussis + echecs;

  const tauxBrut = total > 0 ? Math.round((reussis / total) * 100) : 0;
  const tauxAjuste = evalues > 0 ? Math.round((reussis / evalues) * 100) : 0;

  // Détail par formation : top 5 formations par volume (intéressant pour
  // identifier les formations à problème)
  const parFormation = new Map<string, { titre: string; total: number; reussis: number; echecs: number }>();
  for (const insc of inscriptions) {
    const fId = insc.session.formation.id;
    const entry = parFormation.get(fId) ?? {
      titre: insc.session.formation.titre,
      total: 0,
      reussis: 0,
      echecs: 0,
    };
    entry.total++;
    if (insc.reussite === true) entry.reussis++;
    if (insc.reussite === false) entry.echecs++;
    parFormation.set(fId, entry);
  }
  const topFormations = Array.from(parFormation.entries())
    .map(([id, v]) => ({
      formationId: id,
      titre: v.titre,
      total: v.total,
      reussis: v.reussis,
      echecs: v.echecs,
      taux: v.total > 0 ? Math.round((v.reussis / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return NextResponse.json({
    period,
    total,
    reussis,
    echecs,
    nonEvalues,
    evalues,
    tauxBrut,
    tauxAjuste,
    topFormations,
  });
});
