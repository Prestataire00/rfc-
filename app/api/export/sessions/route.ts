import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessions = await prisma.session.findMany({
      include: {
        formation: { select: { titre: true } },
        formateur: { select: { nom: true, prenom: true } },
        _count: { select: { inscriptions: true } },
      },
      orderBy: { dateDebut: "desc" },
    });

    const header = "Formation;Formateur;Date debut;Date fin;Lieu;Inscrits;Capacite;Statut";
    const rows = sessions.map((s) => {
      const formation = escapeCsv(s.formation.titre);
      const formateur = s.formateur
        ? escapeCsv(`${s.formateur.prenom} ${s.formateur.nom}`)
        : "Non assigné";
      const dateDebut = formatDate(s.dateDebut);
      const dateFin = formatDate(s.dateFin);
      const lieu = escapeCsv(s.lieu || "");
      const inscrits = s._count.inscriptions;
      const capacite = s.capaciteMax;
      const statut = formatStatut(s.statut);
      return `${formation};${formateur};${dateDebut};${dateFin};${lieu};${inscrits};${capacite};${statut}`;
    });

    const csv = "\uFEFF" + [header, ...rows].join("\r\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sessions.csv"',
      },
    });
  } catch (error) {
    console.error("Export sessions error:", error);
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
    planifiee: "Planifiee",
    confirmee: "Confirmee",
    en_cours: "En cours",
    terminee: "Terminee",
    annulee: "Annulee",
  };
  return labels[statut] || statut;
}
