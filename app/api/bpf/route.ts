export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

/**
 * GET /api/bpf?annee=2026
 *
 * Tableau de bord BPF annuel — KPIs et graphiques. Aligné sur le calcul
 * Cerfa 10443*17 :
 *   - inscriptions retenues : statut ∈ ("confirmee", "presente")
 *   - heures-stagiaires : durée formation × inscrits
 *   - CA HT : factures payées (dateEmission dans l'exercice civil)
 *   - financements : source unique = paiements des factures payées
 *     (la table Financement est ignorée pour éviter le double comptage)
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const annee = parseInt(searchParams.get("annee") || String(new Date().getFullYear()));

  const debutAnnee = new Date(annee, 0, 1);
  const finAnnee = new Date(annee, 11, 31, 23, 59, 59);

  const [
    sessionsTerminees,
    sessionsAvecInscrits,
    caRealise,
    sessionsParMois,
    certifications,
    facturesList,
  ] = await Promise.all([
    prisma.session.count({
      where: { statut: "terminee", dateDebut: { gte: debutAnnee, lte: finAnnee } },
    }),
    prisma.session.findMany({
      where: { statut: "terminee", dateDebut: { gte: debutAnnee, lte: finAnnee } },
      include: {
        formation: { select: { duree: true, categorie: true, titre: true } },
        inscriptions: {
          where: { statut: { in: ["confirmee", "presente"] } },
          select: { id: true },
        },
      },
    }),
    prisma.facture.aggregate({
      where: { statut: "payee", dateEmission: { gte: debutAnnee, lte: finAnnee } },
      _sum: { montantHT: true, montantTTC: true },
    }),
    prisma.session.findMany({
      where: { dateDebut: { gte: debutAnnee, lte: finAnnee } },
      select: { dateDebut: true, statut: true },
    }),
    prisma.session.findMany({
      where: {
        statut: "terminee",
        dateDebut: { gte: debutAnnee, lte: finAnnee },
        formation: { certifiante: true },
      },
      include: {
        formation: { select: { titre: true, codeRNCP: true } },
        _count: { select: { inscriptions: true } },
      },
    }),
    prisma.facture.findMany({
      where: { dateEmission: { gte: debutAnnee, lte: finAnnee } },
      include: {
        entreprise: { select: { nom: true } },
        devis: { select: { objet: true } },
      },
      orderBy: { dateEmission: "desc" },
    }),
  ]);

  // Agrégats sessions — inscriptions filtrées (confirmee/presente)
  let totalStagiaires = 0;
  let totalHeures = 0;
  const parCategorie: Record<string, { sessions: number; stagiaires: number }> = {};
  for (const s of sessionsAvecInscrits) {
    const nbIns = s.inscriptions.length;
    totalStagiaires += nbIns;
    totalHeures += s.formation.duree * nbIns;
    const cat = s.formation.categorie || "Non categorise";
    if (!parCategorie[cat]) parCategorie[cat] = { sessions: 0, stagiaires: 0 };
    parCategorie[cat].sessions++;
    parCategorie[cat].stagiaires += nbIns;
  }

  // Sessions par mois (total / terminées)
  const parMois = Array.from({ length: 12 }, (_, i) => ({
    mois: i,
    total: 0,
    terminees: 0,
  }));
  for (const s of sessionsParMois) {
    const m = new Date(s.dateDebut).getMonth();
    parMois[m].total++;
    if (s.statut === "terminee") parMois[m].terminees++;
  }

  // Financements par type — source UNIQUE : paiements des factures payées
  // (la table Financement reste utilisée pour le suivi commercial mais n'est
  // pas réconciliable avec la trésorerie, donc exclue du BPF pour éviter
  // tout double comptage).
  const financementsParType: Record<string, number> = {};
  for (const f of facturesList) {
    if (f.statut !== "payee") continue;
    if (!Array.isArray(f.paiements)) continue;
    for (const p of f.paiements as Array<{ mode?: string; montant?: number }>) {
      if (p?.mode && typeof p.montant === "number") {
        financementsParType[p.mode] = (financementsParType[p.mode] || 0) + p.montant;
      }
    }
  }

  return NextResponse.json({
    annee,
    sessionsTerminees,
    totalStagiaires,
    totalHeures,
    caRealiseHT: caRealise._sum.montantHT ?? 0,
    caRealiseTTC: caRealise._sum.montantTTC ?? 0,
    parCategorie,
    parMois,
    financementsParType,
    certifications,
    factures: facturesList,
  });
});
