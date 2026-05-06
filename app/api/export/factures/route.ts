export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { escapeCsv, formatDateCsv, csvResponse } from "@/lib/export-utils";
import { withErrorHandler } from "@/lib/api-wrapper";

const STATUTS: Record<string, string> = {
  en_attente: "En attente",
  envoyee: "Envoyée",
  payee: "Payée",
  en_retard: "En retard",
  annulee: "Annulée",
};

export const GET = withErrorHandler(async () => {
  const factures = await prisma.facture.findMany({
    include: {
      entreprise: { select: { nom: true } },
    },
    orderBy: { dateEmission: "desc" },
  });

  const header = "Numéro;Client;Montant HT;Montant TTC;Statut;Date émission;Date échéance";
  const rows = factures.map((f) => {
    return [
      escapeCsv(f.numero),
      escapeCsv(f.entreprise?.nom || ""),
      f.montantHT.toFixed(2).replace(".", ","),
      f.montantTTC.toFixed(2).replace(".", ","),
      escapeCsv(STATUTS[f.statut] || f.statut),
      formatDateCsv(f.dateEmission),
      formatDateCsv(f.dateEcheance),
    ].join(";");
  });

  return csvResponse([header, ...rows], "factures.csv");
});
