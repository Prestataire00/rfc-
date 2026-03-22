import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const annee = parseInt(searchParams.get("annee") || String(new Date().getFullYear()));

    const debutAnnee = new Date(annee, 0, 1);
    const finAnnee = new Date(annee, 11, 31, 23, 59, 59);

    const [
      sessionsTerminees,
      totalStagiaires,
      totalHeures,
      caRealise,
      financements,
      formationsParCategorie,
      sessionsParMois,
      certifications,
    ] = await Promise.all([
      prisma.session.count({
        where: { statut: "terminee", dateDebut: { gte: debutAnnee, lte: finAnnee } },
      }),
      prisma.inscription.count({
        where: {
          statut: "presente",
          session: { statut: "terminee", dateDebut: { gte: debutAnnee, lte: finAnnee } },
        },
      }),
      prisma.session.findMany({
        where: { statut: "terminee", dateDebut: { gte: debutAnnee, lte: finAnnee } },
        include: { formation: { select: { duree: true } } },
      }).then((sessions) => sessions.reduce((total, s) => total + s.formation.duree, 0)),
      prisma.facture.aggregate({
        where: { statut: "payee", dateEmission: { gte: debutAnnee, lte: finAnnee } },
        _sum: { montantHT: true, montantTTC: true },
      }),
      prisma.financement.findMany({
        where: { createdAt: { gte: debutAnnee, lte: finAnnee } },
        include: { entreprise: { select: { nom: true } } },
      }),
      prisma.session.findMany({
        where: { statut: "terminee", dateDebut: { gte: debutAnnee, lte: finAnnee } },
        include: {
          formation: { select: { categorie: true, titre: true } },
          _count: { select: { inscriptions: true } },
        },
      }),
      // Sessions par mois
      prisma.session.findMany({
        where: { dateDebut: { gte: debutAnnee, lte: finAnnee } },
        select: { dateDebut: true, statut: true },
      }),
      // Certifications
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
    ]);

    // Aggregate by category
    const parCategorie: Record<string, { sessions: number; stagiaires: number }> = {};
    formationsParCategorie.forEach((s: any) => {
      const cat = s.formation.categorie || "Non categorise";
      if (!parCategorie[cat]) parCategorie[cat] = { sessions: 0, stagiaires: 0 };
      parCategorie[cat].sessions++;
      parCategorie[cat].stagiaires += s._count.inscriptions;
    });

    // Aggregate by month
    const parMois = Array.from({ length: 12 }, (_, i) => ({
      mois: i,
      total: 0,
      terminees: 0,
    }));
    (sessionsParMois as any[]).forEach((s: any) => {
      const m = new Date(s.dateDebut).getMonth();
      parMois[m].total++;
      if (s.statut === "terminee") parMois[m].terminees++;
    });

    // Financements by type
    const financementsParType: Record<string, number> = {};
    financements.forEach((f: any) => {
      financementsParType[f.type] = (financementsParType[f.type] || 0) + f.montant;
    });

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
      financements,
      certifications,
    });
  } catch (err: unknown) {
    console.error("Erreur GET BPF:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du bilan pédagogique et financier" }, { status: 500 });
  }
}
