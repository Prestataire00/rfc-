export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const annee = Number(req.nextUrl.searchParams.get("annee")) || new Date().getFullYear();

    const startDate = new Date(annee, 0, 1);
    const endDate = new Date(annee, 11, 31, 23, 59, 59);

    const sessions = await prisma.session.findMany({
      where: {
        dateDebut: { gte: startDate, lte: endDate },
        statut: "terminee",
      },
      include: {
        formation: true,
        formateur: true,
        inscriptions: {
          where: { statut: { in: ["confirmee", "presente"] } },
          include: {
            contact: {
              include: { entreprise: true },
            },
          },
        },
      },
      orderBy: { dateDebut: "asc" },
    });

    // Build CSV
    const lines: string[] = [];

    // Section 1: Résumé
    lines.push("BILAN PEDAGOGIQUE ET FINANCIER - " + annee);
    lines.push("");
    lines.push("RESUME");
    lines.push(`Nombre de sessions;${sessions.length}`);
    const totalStagiaires = sessions.reduce((sum, s) => sum + s.inscriptions.length, 0);
    lines.push(`Nombre total de stagiaires;${totalStagiaires}`);
    const totalHeures = sessions.reduce((sum, s) => sum + s.formation.duree * s.inscriptions.length, 0);
    lines.push(`Nombre total d'heures-stagiaires;${totalHeures}`);
    const caTotal = sessions.reduce((sum, s) => sum + s.formation.tarif * s.inscriptions.length, 0);
    lines.push(`Chiffre d'affaires HT;${caTotal.toFixed(2)}`);
    lines.push("");

    // Section 2: Detail par session
    lines.push("DÉTAIL DES SESSIONS");
    lines.push("Formation;Date début;Date fin;Lieu;Formateur;Nb stagiaires;Durée (h);CA HT");

    for (const s of sessions) {
      const formateur = s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : "";
      const nbInscrits = s.inscriptions.length;
      const ca = s.formation.tarif * nbInscrits;
      lines.push(
        [
          `"${s.formation.titre}"`,
          new Date(s.dateDebut).toLocaleDateString("fr-FR"),
          new Date(s.dateFin).toLocaleDateString("fr-FR"),
          s.lieu || "",
          formateur,
          nbInscrits,
          s.formation.duree,
          ca.toFixed(2),
        ].join(";")
      );
    }

    lines.push("");

    // Section 3: Detail par stagiaire
    lines.push("DÉTAIL DES STAGIAIRES");
    lines.push("Formation;Date début;Stagiaire;Email;Entreprise;Durée (h)");

    for (const s of sessions) {
      for (const insc of s.inscriptions) {
        lines.push(
          [
            `"${s.formation.titre}"`,
            new Date(s.dateDebut).toLocaleDateString("fr-FR"),
            `${insc.contact.prenom} ${insc.contact.nom}`,
            insc.contact.email,
            insc.contact.entreprise?.nom || "",
            s.formation.duree,
          ].join(";")
        );
      }
    }

    // Section 4: Par catégorie
    lines.push("");
    lines.push("PAR CATÉGORIE");
    lines.push("Catégorie;Nb sessions;Nb stagiaires");
    const parCategorie: Record<string, { sessions: number; stagiaires: number }> = {};
    for (const s of sessions) {
      const cat = s.formation.categorie || "Non catégorisé";
      if (!parCategorie[cat]) parCategorie[cat] = { sessions: 0, stagiaires: 0 };
      parCategorie[cat].sessions++;
      parCategorie[cat].stagiaires += s.inscriptions.length;
    }
    for (const [cat, val] of Object.entries(parCategorie)) {
      lines.push(`${cat};${val.sessions};${val.stagiaires}`);
    }

    const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="BPF-${annee}.csv"`,
      },
    });
  } catch (err: unknown) {
    console.error("Erreur export BPF:", err);
    return NextResponse.json({ error: "Erreur lors de l'export du bilan pedagogique et financier" }, { status: 500 });
  }
}
