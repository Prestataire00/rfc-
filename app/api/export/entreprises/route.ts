export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { escapeCsv, formatDateCsv, csvResponse } from "@/lib/export-utils";

export async function GET() {
  try {
    const entreprises = await prisma.entreprise.findMany({
      include: { _count: { select: { contacts: true } } },
      orderBy: { nom: "asc" },
    });

    const header = "Nom;SIRET;Secteur;Ville;Email;Téléphone;Nb contacts;Date création";
    const rows = entreprises.map((e) => {
      return [
        escapeCsv(e.nom),
        escapeCsv(e.siret || ""),
        escapeCsv(e.secteur || ""),
        escapeCsv(e.ville || ""),
        escapeCsv(e.email || ""),
        escapeCsv(e.telephone || ""),
        String(e._count.contacts),
        formatDateCsv(e.createdAt),
      ].join(";");
    });

    return csvResponse([header, ...rows], "entreprises.csv");
  } catch (error) {
    console.error("Export entreprises error:", error);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}
