// Certifications stagiaires : liste + statistiques annuelles.
// Adresse l'exigence du cahier des charges §2.2 :
// "Un module permettra de suivre les formations certifiantes, de gérer
// les échéances et de produire des statistiques annuelles sur les taux
// de réussite et les certifications obtenues."

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const annee = parseInt(searchParams.get("annee") || String(new Date().getFullYear()), 10);
  const statutFilter = searchParams.get("statut"); // valide | expire | en_cours_recyclage

  const debutAnnee = new Date(annee, 0, 1);
  const finAnnee = new Date(annee, 11, 31, 23, 59, 59);

  // Liste des certifications (filtre statut optionnel, année par dateObtention)
  const where: {
    dateObtention: { gte: Date; lte: Date };
    statut?: string;
  } = {
    dateObtention: { gte: debutAnnee, lte: finAnnee },
  };
  if (statutFilter) where.statut = statutFilter;

  const certifications = await prisma.certificationStagiaire.findMany({
    where,
    include: {
      contact: { select: { id: true, nom: true, prenom: true, email: true, entreprise: { select: { id: true, nom: true } } } },
      formation: { select: { id: true, titre: true, certifiante: true, codeRNCP: true, dureeRecyclage: true } },
    },
    orderBy: { dateObtention: "desc" },
  });

  // ── Statistiques annuelles ──────────────────────────────────────────────
  // Taux de réussite = certifications obtenues / sessions de formations certifiantes terminées
  // sur la période. Une session "réussie" = au moins 1 certification émise.

  // Sessions terminées année courante, sur formations certifiantes uniquement
  const sessionsTerminees = await prisma.session.findMany({
    where: {
      statut: "terminee",
      dateFin: { gte: debutAnnee, lte: finAnnee },
      formation: { certifiante: true },
    },
    select: {
      id: true,
      _count: {
        select: {
          inscriptions: { where: { statut: { in: ["presente", "confirmee"] } } },
        },
      },
    },
  });

  const nbSessionsCertifiantes = sessionsTerminees.length;
  const nbInscritsCertifiantsTotal = sessionsTerminees.reduce((sum, s) => sum + s._count.inscriptions, 0);
  const nbCertifiesAnnee = certifications.length;
  const tauxReussite = nbInscritsCertifiantsTotal > 0
    ? Math.round((nbCertifiesAnnee / nbInscritsCertifiantsTotal) * 100)
    : 0;

  // Echéances à venir (60 prochains jours, indépendantes de l'année filtrée)
  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
  const echeancesProches = await prisma.certificationStagiaire.count({
    where: {
      dateExpiration: { lte: sixtyDaysFromNow, gte: new Date() },
      statut: { not: "en_cours_recyclage" },
    },
  });

  // Répartition par statut (sur l'année filtrée)
  const repartitionStatut = await prisma.certificationStagiaire.groupBy({
    by: ["statut"],
    where: { dateObtention: { gte: debutAnnee, lte: finAnnee } },
    _count: true,
  });

  return NextResponse.json({
    annee,
    certifications,
    stats: {
      nbCertifiesAnnee,
      nbSessionsCertifiantes,
      nbInscritsCertifiantsTotal,
      tauxReussite,
      echeancesProches,
      repartitionStatut: repartitionStatut.reduce((acc, r) => {
        acc[r.statut] = r._count;
        return acc;
      }, {} as Record<string, number>),
    },
  });
});
