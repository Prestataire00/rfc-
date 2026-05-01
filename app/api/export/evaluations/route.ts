export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { escapeCsv, formatDateCsv, csvResponse } from "@/lib/export-utils";
import { withErrorHandler } from "@/lib/api-wrapper";

const TYPES: Record<string, string> = {
  satisfaction_chaud: "Satisfaction à chaud",
  satisfaction_froid: "Satisfaction à froid",
  acquis: "Acquis",
};

export const GET = withErrorHandler(async () => {
  const evaluations = await prisma.evaluation.findMany({
    include: {
      session: { include: { formation: { select: { titre: true } } } },
      contact: { select: { nom: true, prenom: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = "Formation;Session date;Stagiaire;Type;Note globale;Complétée;Date";
  const rows = evaluations.map((e) => {
    return [
      escapeCsv(e.session.formation.titre),
      formatDateCsv(e.session.dateDebut),
      e.contact ? escapeCsv(`${e.contact.prenom} ${e.contact.nom}`) : "",
      escapeCsv(TYPES[e.type] || e.type),
      e.noteGlobale !== null ? String(e.noteGlobale) : "",
      e.estComplete ? "Oui" : "Non",
      formatDateCsv(e.createdAt),
    ].join(";");
  });

  return csvResponse([header, ...rows], "evaluations.csv");
});
