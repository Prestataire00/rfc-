export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { escapeCsv, formatDateCsv, csvResponse } from "@/lib/export-utils";
import { withErrorHandler } from "@/lib/api-wrapper";

const TYPES: Record<string, string> = {
  prospect: "Prospect",
  client: "Client",
  stagiaire: "Stagiaire",
};

export const GET = withErrorHandler(async () => {
  const contacts = await prisma.contact.findMany({
    include: {
      entreprise: { select: { nom: true } },
    },
    orderBy: { nom: "asc" },
  });

  const header = "Nom;Prénom;Email;Téléphone;Type;Entreprise;Date création";
  const rows = contacts.map((c) => {
    return [
      escapeCsv(c.nom),
      escapeCsv(c.prenom),
      escapeCsv(c.email),
      escapeCsv(c.telephone || ""),
      escapeCsv(TYPES[c.type] || c.type),
      escapeCsv(c.entreprise?.nom || ""),
      formatDateCsv(c.createdAt),
    ].join(";");
  });

  return csvResponse([header, ...rows], "contacts.csv");
});
