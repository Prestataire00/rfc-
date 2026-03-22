import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const debutAnnee = new Date(now.getFullYear(), 0, 1);
  const finAnnee = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  // Start of current week (Monday)
  const debutSemaine = new Date(now);
  const day = debutSemaine.getDay();
  const diff = debutSemaine.getDate() - day + (day === 0 ? -6 : 1);
  debutSemaine.setDate(diff);
  debutSemaine.setHours(0, 0, 0, 0);
  const finSemaine = new Date(debutSemaine);
  finSemaine.setDate(finSemaine.getDate() + 6);
  finSemaine.setHours(23, 59, 59, 999);

  const [
    nbContacts,
    nbEntreprises,
    nbFormateurs,
    nbFormations,
    sessionsAVenir,
    devisEnvoyesAgg,
    caFactureMoisAgg,
    caFactureAnneeAgg,
    caPrevisionnel,
    prochainsSessions,
    derniersContacts,
    sessionsSemaine,
    sessionsAujourdhui,
    nbStagiairesFormes,
    nbFormationsRealisees,
    nbBesoinsEnCours,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.entreprise.count(),
    prisma.formateur.count({ where: { actif: true } }),
    prisma.formation.count({ where: { actif: true } }),
    prisma.session.count({
      where: { dateDebut: { gte: now }, statut: { in: ["planifiee", "confirmee"] } },
    }),
    prisma.devis.aggregate({
      where: { statut: "envoye" },
      _sum: { montantTTC: true },
      _count: true,
    }),
    prisma.facture.aggregate({
      where: { statut: "payee", dateEmission: { gte: debutMois, lte: finMois } },
      _sum: { montantTTC: true },
    }),
    prisma.facture.aggregate({
      where: { statut: "payee", dateEmission: { gte: debutAnnee, lte: finAnnee } },
      _sum: { montantTTC: true },
    }),
    prisma.devis.aggregate({
      where: { statut: { in: ["envoye", "signe"] } },
      _sum: { montantTTC: true },
    }),
    prisma.session.findMany({
      where: { dateDebut: { gte: now }, statut: { in: ["planifiee", "confirmee"] } },
      include: {
        formation: { select: { titre: true } },
        formateur: { select: { nom: true, prenom: true } },
        _count: { select: { inscriptions: true } },
      },
      orderBy: { dateDebut: "asc" },
      take: 5,
    }),
    prisma.contact.findMany({
      include: { entreprise: { select: { nom: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.session.findMany({
      where: {
        dateDebut: { lte: finSemaine },
        dateFin: { gte: debutSemaine },
        statut: { in: ["planifiee", "confirmee", "en_cours"] },
      },
      include: {
        formation: { select: { titre: true } },
        formateur: { select: { nom: true, prenom: true } },
        _count: { select: { inscriptions: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.session.findMany({
      where: {
        dateDebut: { lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59) },
        dateFin: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0) },
        statut: { in: ["confirmee", "en_cours"] },
      },
      include: {
        formation: { select: { titre: true } },
        formateur: { select: { nom: true, prenom: true } },
        _count: { select: { inscriptions: true } },
      },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.inscription.count({
      where: { statut: "presente", session: { statut: "terminee", dateDebut: { gte: debutAnnee } } },
    }),
    prisma.session.count({
      where: { statut: "terminee", dateDebut: { gte: debutAnnee } },
    }),
    prisma.besoinFormation.count({
      where: { statut: { in: ["nouveau", "qualifie"] } },
    }),
  ]);

  return NextResponse.json({
    stats: {
      nbContacts,
      nbEntreprises,
      nbFormateurs,
      nbFormations,
      sessionsAVenir,
      devisEnvoyes: devisEnvoyesAgg._count,
      montantDevisEnvoyes: devisEnvoyesAgg._sum.montantTTC ?? 0,
      caFactureMois: caFactureMoisAgg._sum.montantTTC ?? 0,
      caFactureAnnee: caFactureAnneeAgg._sum.montantTTC ?? 0,
      caPrevisionnel: caPrevisionnel._sum.montantTTC ?? 0,
      nbStagiairesFormes,
      nbFormationsRealisees,
      nbBesoinsEnCours,
    },
    prochainsSessions,
    derniersContacts,
    sessionsSemaine,
    sessionsAujourdhui,
  });
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des statistiques du tableau de bord:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des statistiques" }, { status: 500 });
  }
}
