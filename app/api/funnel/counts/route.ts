// GET /api/funnel/counts
// Renvoie les compteurs du tunnel commercial (6 étapes : prospect → gagné).
// Utilisé par le widget funnel du dashboard et potentiellement par les badges
// de la sidebar. Période par défaut : ce mois calendaire.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "mois";

  const now = new Date();
  let debut: Date;
  switch (period) {
    case "semaine":
      debut = new Date(now);
      debut.setDate(now.getDate() - 7);
      break;
    case "annee":
      debut = new Date(now.getFullYear(), 0, 1);
      break;
    case "trimestre":
      debut = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case "tout":
      debut = new Date(0);
      break;
    case "mois":
    default:
      debut = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }
  const dateFilter = { gte: debut };

  // Compteurs des 6 étapes du tunnel — chaque étape filtre sur createdAt
  // (cohérence avec la période sélectionnée).
  const [
    nbProspects,
    nbFichesEnvoyees,
    nbFichesRepondues,
    nbDevisBrouillons,
    nbDevisEnvoyes,
    nbDevisSignes,
  ] = await Promise.all([
    // 1. Prospects créés sur la période
    prisma.demande.count({
      where: { createdAt: dateFilter },
    }),
    // 2. Fiches envoyées (entreprise OU stagiaire) sur la période
    Promise.all([
      prisma.fichePreFormationEntreprise.count({
        where: { createdAt: dateFilter, statut: { in: ["envoye", "repondu"] } },
      }),
      prisma.fichePreFormationStagiaire.count({
        where: { createdAt: dateFilter, statut: { in: ["envoye", "repondu"] } },
      }),
    ]).then(([a, b]) => a + b),
    // 3. Fiches reçues (statut = "repondu")
    Promise.all([
      prisma.fichePreFormationEntreprise.count({
        where: { createdAt: dateFilter, statut: "repondu" },
      }),
      prisma.fichePreFormationStagiaire.count({
        where: { createdAt: dateFilter, statut: "repondu" },
      }),
    ]).then(([a, b]) => a + b),
    // 4. Devis brouillons (à réviser)
    prisma.devis.count({
      where: { createdAt: dateFilter, statut: "brouillon" },
    }),
    // 5. Devis envoyés (pour signature)
    prisma.devis.count({
      where: { createdAt: dateFilter, statut: "envoye" },
    }),
    // 6. Devis signés (gagné)
    prisma.devis.count({
      where: { createdAt: dateFilter, statut: "signe" },
    }),
  ]);

  // Taux de conversion : devis signés / prospects créés
  const tauxConversion = nbProspects > 0
    ? Math.round((nbDevisSignes / nbProspects) * 100)
    : 0;

  return NextResponse.json({
    period,
    steps: {
      prospects: nbProspects,
      fichesEnvoyees: nbFichesEnvoyees,
      fichesRepondues: nbFichesRepondues,
      devisBrouillons: nbDevisBrouillons,
      devisEnvoyes: nbDevisEnvoyes,
      devisSignes: nbDevisSignes,
    },
    tauxConversion,
  });
});
