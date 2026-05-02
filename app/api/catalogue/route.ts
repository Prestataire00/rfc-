export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

// GET /api/catalogue — liste publique des formations publiees avec sessions disponibles
// Pas d'authentification requise.
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const categorie = searchParams.get("categorie");
  const modalite = searchParams.get("modalite");
  const certifiante = searchParams.get("certifiante");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { statut: "publiee", actif: true };
  if (categorie) where.categorie = categorie;
  if (modalite) where.modalite = modalite;
  if (certifiante === "true") where.certifiante = true;

  const formations = await prisma.formation.findMany({
    where,
    orderBy: [{ misEnAvant: "desc" }, { titre: "asc" }],
    select: {
      id: true,
      titre: true,
      description: true,
      duree: true,
      tarif: true,
      categorie: true,
      modalite: true,
      certifiante: true,
      niveau: true,
      misEnAvant: true,
      image: true,
      publicCible: true,
      prerequis: true,
      objectifs: true,
      contenuProgramme: true,
      methodesPedagogiques: true,
      accessibilite: true,
      typesFinancement: true,
      dureeRecyclage: true,
      sessions: {
        where: {
          dateDebut: { gte: new Date() },
          statut: { in: ["planifiee", "confirmee"] },
        },
        orderBy: { dateDebut: "asc" },
        select: {
          id: true,
          dateDebut: true,
          dateFin: true,
          lieu: true,
          capaciteMax: true,
          tokenInscription: true,
          _count: { select: { inscriptions: true } },
        },
      },
    },
  });

  // Ajouter les places restantes
  const result = formations.map((f) => ({
    ...f,
    sessions: f.sessions.map((s) => ({
      ...s,
      placesRestantes: s.capaciteMax - s._count.inscriptions,
    })),
  }));

  // Lister les categories disponibles
  const categories = await prisma.formation.findMany({
    where: { statut: "publiee", actif: true },
    select: { categorie: true },
    distinct: ["categorie"],
  });

  return NextResponse.json({
    formations: result,
    categories: categories.map((c) => c.categorie).filter(Boolean),
  });
});
