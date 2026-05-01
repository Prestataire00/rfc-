export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { escapeCsv, formatDateCsv, csvResponse } from "@/lib/export-utils";
import { withErrorHandler } from "@/lib/api-wrapper";

const STATUTS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  signe: "Signé",
  refuse: "Refusé",
  expire: "Expiré",
};

export const GET = withErrorHandler(async () => {
  const devis = await prisma.devis.findMany({
    include: {
      entreprise: { select: { nom: true } },
      contact: { select: { nom: true, prenom: true } },
    },
    orderBy: { dateEmission: "desc" },
  });

  const header = "Numéro;Objet;Client;Montant HT;Montant TTC;Statut;Date émission;Date validité";
  const rows = devis.map((d) => {
    const client = d.entreprise?.nom
      || (d.contact ? `${d.contact.prenom} ${d.contact.nom}` : "");
    return [
      escapeCsv(d.numero),
      escapeCsv(d.objet),
      escapeCsv(client),
      d.montantHT.toFixed(2).replace(".", ","),
      d.montantTTC.toFixed(2).replace(".", ","),
      escapeCsv(STATUTS[d.statut] || d.statut),
      formatDateCsv(d.dateEmission),
      formatDateCsv(d.dateValidite),
    ].join(";");
  });

  return csvResponse([header, ...rows], "devis.csv");
});
