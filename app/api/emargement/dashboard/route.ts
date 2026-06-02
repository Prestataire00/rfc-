// GET /api/emargement/dashboard
//
// Vue agrégée des présences/absences par session pour le suivi admin.
// Renvoie pour chaque session confirmée/en_cours/terminée :
//   - infos session (id, formation, dates, statut, lieu, formateur)
//   - nbInscrits, nbPresents, nbAbsents, nbRetards, nbExcuses
//   - tauxPresence (%) calculé sur les créneaux émargés
//   - jours déjà émargés / total créneaux théoriques (jours × 2)
//
// Filtre par défaut : sessions actives (en_cours + confirmee) + terminées
// dans les 30 derniers jours. Query ?statut=tous|actives|terminees pour
// override.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const filtre = url.searchParams.get("statut") ?? "actives";

  const now = new Date();
  const j30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {};
  if (filtre === "actives") {
    where.statut = { in: ["confirmee", "en_cours"] };
  } else if (filtre === "terminees") {
    where.statut = "terminee";
    where.dateFin = { gte: j30 };
  } else if (filtre === "tous") {
    where.statut = { in: ["confirmee", "en_cours", "terminee"] };
    where.OR = [{ statut: { in: ["confirmee", "en_cours"] } }, { dateFin: { gte: j30 } }];
  }

  const sessions = await prisma.session.findMany({
    where,
    orderBy: { dateDebut: "desc" },
    include: {
      formation: { select: { titre: true } },
      formateur: { select: { prenom: true, nom: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        select: { id: true, contactId: true },
      },
      feuillesPresence: {
        select: {
          id: true,
          contactId: true,
          date: true,
          statutMatin: true,
          statutApresMidi: true,
          signatureMatin: true,
          signatureApresMidi: true,
        },
      },
    },
    take: 100,
  });

  const rows = sessions.map((s) => {
    // Statistiques par session — agrégat sur tous les créneaux émargés
    let nbPresents = 0;
    let nbAbsents = 0;
    let nbRetards = 0;
    let nbExcuses = 0;
    let nbSignes = 0;
    let nbCreneauxRenseignes = 0;

    for (const fp of s.feuillesPresence) {
      for (const statut of [fp.statutMatin, fp.statutApresMidi]) {
        if (!statut) continue;
        nbCreneauxRenseignes++;
        if (statut === "present") nbPresents++;
        else if (statut === "absent") nbAbsents++;
        else if (statut === "en_retard") nbRetards++;
        else if (statut === "excuse") nbExcuses++;
      }
      if (fp.signatureMatin) nbSignes++;
      if (fp.signatureApresMidi) nbSignes++;
    }

    // Créneaux théoriques : nbJours × 2 × nbInscrits
    const start = new Date(s.dateDebut);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(s.dateFin);
    end.setUTCHours(0, 0, 0, 0);
    const nbJours = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    const creneauxTheoriques = nbJours * 2 * s.inscriptions.length;

    const tauxPresence =
      nbCreneauxRenseignes > 0
        ? Math.round((nbPresents / nbCreneauxRenseignes) * 100)
        : null;

    return {
      id: s.id,
      formation: s.formation.titre,
      formateur: s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : null,
      lieu: s.lieu,
      statut: s.statut,
      dateDebut: s.dateDebut.toISOString(),
      dateFin: s.dateFin.toISOString(),
      nbJours,
      nbInscrits: s.inscriptions.length,
      nbPresents,
      nbAbsents,
      nbRetards,
      nbExcuses,
      nbSignes,
      nbCreneauxRenseignes,
      creneauxTheoriques,
      tauxPresence,
    };
  });

  // Stats globales
  const totaux = rows.reduce(
    (acc, r) => ({
      sessions: acc.sessions + 1,
      inscrits: acc.inscrits + r.nbInscrits,
      presents: acc.presents + r.nbPresents,
      absents: acc.absents + r.nbAbsents,
      retards: acc.retards + r.nbRetards,
      signes: acc.signes + r.nbSignes,
      creneauxRenseignes: acc.creneauxRenseignes + r.nbCreneauxRenseignes,
      creneauxTheoriques: acc.creneauxTheoriques + r.creneauxTheoriques,
    }),
    { sessions: 0, inscrits: 0, presents: 0, absents: 0, retards: 0, signes: 0, creneauxRenseignes: 0, creneauxTheoriques: 0 },
  );

  const tauxPresenceGlobal =
    totaux.creneauxRenseignes > 0
      ? Math.round((totaux.presents / totaux.creneauxRenseignes) * 100)
      : null;
  const tauxCompletion =
    totaux.creneauxTheoriques > 0
      ? Math.round((totaux.creneauxRenseignes / totaux.creneauxTheoriques) * 100)
      : null;

  return NextResponse.json({
    filtre,
    totaux: { ...totaux, tauxPresenceGlobal, tauxCompletion },
    sessions: rows,
  });
});
