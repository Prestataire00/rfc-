export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bpfPdf } from "@/lib/pdf/templates";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const annee = Number(req.nextUrl.searchParams.get("annee")) || new Date().getFullYear();
  const startDate = new Date(annee, 0, 1);
  const endDate = new Date(annee, 11, 31, 23, 59, 59);

  const sessions = await prisma.session.findMany({
    where: { dateDebut: { gte: startDate, lte: endDate }, statut: "terminee" },
    include: {
      formation: true,
      formateur: true,
      inscriptions: { where: { statut: { in: ["confirmee", "presente"] } } },
    },
    orderBy: { dateDebut: "asc" },
  });

  const nbSessions = sessions.length;
  const nbStagiaires = sessions.reduce((sum, s) => sum + s.inscriptions.length, 0);
  const nbHeures = sessions.reduce((sum, s) => sum + s.formation.duree * s.inscriptions.length, 0);
  const caTotal = sessions.reduce((sum, s) => sum + s.formation.tarif * s.inscriptions.length, 0);

  const parCategorie: Record<string, { sessions: number; stagiaires: number }> = {};
  for (const s of sessions) {
    const cat = s.formation.categorie || "Non catégorisé";
    if (!parCategorie[cat]) parCategorie[cat] = { sessions: 0, stagiaires: 0 };
    parCategorie[cat].sessions++;
    parCategorie[cat].stagiaires += s.inscriptions.length;
  }

  const docDef = bpfPdf({
    annee,
    nbSessions,
    nbStagiaires,
    nbHeures,
    caTotal,
    sessions: sessions.map((s) => ({
      formation: s.formation.titre,
      dateDebut: s.dateDebut.toISOString(),
      dateFin: s.dateFin.toISOString(),
      lieu: s.lieu || "",
      formateur: s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : "",
      nbInscrits: s.inscriptions.length,
      duree: s.formation.duree,
      ca: s.formation.tarif * s.inscriptions.length,
    })),
    parCategorie: Object.entries(parCategorie).map(([categorie, val]) => ({
      categorie,
      sessions: val.sessions,
      stagiaires: val.stagiaires,
    })),
  });

  const buffer = await generatePdfBuffer(docDef);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="BPF-${annee}.pdf"`,
    },
  });
});
