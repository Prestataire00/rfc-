export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const formations = await prisma.formation.findMany({
      include: {
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const header = "Titre;Catégorie;Durée (h);Tarif (EUR);Niveau;Sessions;Statut";
    const rows = formations.map((f) => {
      const titre = escapeCsv(f.titre);
      const categorie = escapeCsv(f.categorie || "");
      const duree = f.duree;
      const tarif = f.tarif.toFixed(2).replace(".", ",");
      const niveau = f.niveau;
      const sessions = f._count.sessions;
      const statut = f.actif ? "Active" : "Inactive";
      return `${titre};${categorie};${duree};${tarif};${niveau};${sessions};${statut}`;
    });

    const csv = "\uFEFF" + [header, ...rows].join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="formations.csv"',
      },
    });
  } catch (error) {
    console.error("Export formations error:", error);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}

function escapeCsv(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
