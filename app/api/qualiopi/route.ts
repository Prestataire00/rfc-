export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const indicateurs = await prisma.indicateurQualiopi.findMany({
      include: {
        preuves: true,
      },
      orderBy: [{ critere: "asc" }, { numero: "asc" }],
    });

    // Group by critère
    const criteres: Record<number, typeof indicateurs> = {};
    for (const ind of indicateurs) {
      if (!criteres[ind.critere]) criteres[ind.critere] = [];
      criteres[ind.critere].push(ind);
    }

    // Compute stats
    const total = indicateurs.length;
    const conformes = indicateurs.filter((i) => i.statut === "conforme").length;
    const enCours = indicateurs.filter((i) => i.statut === "en_cours").length;
    const nonConformes = indicateurs.filter((i) => i.statut === "non_conforme").length;
    const nonApplicables = indicateurs.filter((i) => i.statut === "non_applicable").length;
    const applicable = total - nonApplicables;
    const conformitePercent = applicable > 0 ? Math.round((conformes / applicable) * 100) : 0;

    return NextResponse.json({
      indicateurs,
      criteres,
      stats: { total, conformes, enCours, nonConformes, nonApplicables, conformitePercent },
    });
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des indicateurs Qualiopi:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des indicateurs Qualiopi" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, statut, commentaire, dateAudit, prioritaire } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const data: any = {};
    if (statut !== undefined) data.statut = statut;
    if (commentaire !== undefined) data.commentaire = commentaire;
    if (dateAudit !== undefined) data.dateAudit = dateAudit ? new Date(dateAudit) : null;
    if (prioritaire !== undefined) data.prioritaire = prioritaire;

    const indicateur = await prisma.indicateurQualiopi.update({
      where: { id },
      data,
      include: { preuves: true },
    });

    return NextResponse.json(indicateur);
  } catch (err: unknown) {
    console.error("Erreur lors de la mise à jour de l'indicateur Qualiopi:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de l'indicateur" }, { status: 500 });
  }
}
