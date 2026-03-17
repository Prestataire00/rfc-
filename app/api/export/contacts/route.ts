import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        entreprise: { select: { nom: true, ville: true } },
      },
      orderBy: { nom: "asc" },
    });

    const header = "Nom;Prenom;Email;Telephone;Entreprise;Ville";
    const rows = contacts.map((c) => {
      const nom = escapeCsv(c.nom);
      const prenom = escapeCsv(c.prenom);
      const email = escapeCsv(c.email);
      const telephone = escapeCsv(c.telephone || "");
      const entreprise = escapeCsv(c.entreprise?.nom || "");
      const ville = escapeCsv(c.entreprise?.ville || "");
      return `${nom};${prenom};${email};${telephone};${entreprise};${ville}`;
    });

    const csv = "\uFEFF" + [header, ...rows].join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="contacts.csv"',
      },
    });
  } catch (error) {
    console.error("Export contacts error:", error);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}

function escapeCsv(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
