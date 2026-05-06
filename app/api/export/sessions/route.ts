export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { escapeCsv, formatDateCsv, csvResponse } from "@/lib/export-utils";
import { withErrorHandler } from "@/lib/api-wrapper";

const STATUTS: Record<string, string> = {
  planifiee: "Planifiée",
  confirmee: "Confirmée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

export const GET = withErrorHandler(async () => {
  const sessions = await prisma.session.findMany({
    include: {
      formation: { select: { titre: true } },
      formateur: { select: { nom: true, prenom: true } },
      _count: { select: { inscriptions: true } },
    },
    orderBy: { dateDebut: "desc" },
  });

  const header = "Formation;Formateur;Date début;Date fin;Lieu;Inscrits;Capacité;Statut";
  const rows = sessions.map((s) => {
    const formateur = s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : "Non assigné";
    return [
      escapeCsv(s.formation.titre),
      escapeCsv(formateur),
      formatDateCsv(s.dateDebut),
      formatDateCsv(s.dateFin),
      escapeCsv(s.lieu || ""),
      String(s._count.inscriptions),
      String(s.capaciteMax),
      escapeCsv(STATUTS[s.statut] || s.statut),
    ].join(";");
  });

  return csvResponse([header, ...rows], "sessions.csv");
});
