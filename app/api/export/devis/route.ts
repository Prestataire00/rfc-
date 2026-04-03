export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { escapeCsv, formatDateCsv, csvResponse } from "@/lib/export-utils";

const STATUTS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  signe: "Signé",
  refuse: "Refusé",
  expire: "Expiré",
};

export async function GET() {
  try {
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
  } catch (error) {
    console.error("Export devis error:", error);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}
