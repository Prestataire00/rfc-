export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const factures = await prisma.facture.findMany({
      include: {
        entreprise: { select: { nom: true } },
      },
      orderBy: { dateEmission: "desc" },
    });

    const header = "Numéro;Client;Montant HT;Montant TTC;Statut;Date émission;Date échéance";
    const rows = factures.map((f) => {
      const numero = escapeCsv(f.numero);
      const client = escapeCsv(f.entreprise?.nom || "");
      const montantHT = f.montantHT.toFixed(2).replace(".", ",");
      const montantTTC = f.montantTTC.toFixed(2).replace(".", ",");
      const statut = formatStatut(f.statut);
      const dateEmission = formatDate(f.dateEmission);
      const dateEcheance = formatDate(f.dateEcheance);
      return `${numero};${client};${montantHT};${montantTTC};${statut};${dateEmission};${dateEcheance}`;
    });

    const csv = "\uFEFF" + [header, ...rows].join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="factures.csv"',
      },
    });
  } catch (error) {
    console.error("Export factures error:", error);
    return NextResponse.json({ error: "Erreur export" }, { status: 500 });
  }
}

function escapeCsv(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStatut(statut: string): string {
  const labels: Record<string, string> = {
    en_attente: "En attente",
    envoyee: "Envoyée",
    payee: "Payée",
    en_retard: "En retard",
    annulee: "Annulée",
  };
  return labels[statut] || statut;
}
