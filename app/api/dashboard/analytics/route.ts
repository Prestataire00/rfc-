import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // Get all factures for the last 12 months (for revenue)
    const factures = await prisma.facture.findMany({
      where: {
        dateEmission: { gte: twelveMonthsAgo },
        statut: { in: ["payee", "envoyee", "en_attente"] },
      },
      select: {
        montantHT: true,
        montantTTC: true,
        dateEmission: true,
        statut: true,
      },
    });

    // Get all sessions for the last 12 months
    const sessions = await prisma.session.findMany({
      where: {
        dateDebut: { gte: twelveMonthsAgo },
      },
      include: {
        formation: { select: { id: true, titre: true } },
        formateur: { select: { id: true, nom: true, prenom: true } },
        _count: { select: { inscriptions: true } },
      },
    });

    // Get all sessions for status distribution (no date filter)
    const allSessions = await prisma.session.findMany({
      select: { statut: true },
    });

    // Get all inscriptions for the last 12 months
    const inscriptions = await prisma.inscription.findMany({
      where: {
        dateInscription: { gte: twelveMonthsAgo },
      },
      select: {
        dateInscription: true,
        sessionId: true,
      },
    });

    // Build monthly data
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const monthLabels = months.map((m) => {
      const [year, month] = m.split("-");
      const monthNames = [
        "Jan", "Fev", "Mar", "Avr", "Mai", "Juin",
        "Juil", "Aout", "Sep", "Oct", "Nov", "Dec",
      ];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    });

    // CA mensuel
    const revenueByMonth = months.map((m) => {
      const [year, month] = m.split("-").map(Number);
      return factures
        .filter((f) => {
          const d = new Date(f.dateEmission);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        })
        .reduce((sum, f) => sum + f.montantHT, 0);
    });

    // Sessions par mois
    const sessionsByMonth = months.map((m) => {
      const [year, month] = m.split("-").map(Number);
      return sessions.filter((s) => {
        const d = new Date(s.dateDebut);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      }).length;
    });

    // Inscriptions par mois
    const inscriptionsByMonth = months.map((m) => {
      const [year, month] = m.split("-").map(Number);
      return inscriptions.filter((i) => {
        const d = new Date(i.dateInscription);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      }).length;
    });

    // Taux de remplissage moyen par mois
    const fillRateByMonth = months.map((m) => {
      const [year, month] = m.split("-").map(Number);
      const monthSessions = sessions.filter((s) => {
        const d = new Date(s.dateDebut);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      if (monthSessions.length === 0) return 0;
      const avg =
        monthSessions.reduce(
          (sum, s) => sum + (s._count.inscriptions / s.capaciteMax) * 100,
          0
        ) / monthSessions.length;
      return Math.round(avg);
    });

    // Top 5 formations by inscriptions
    const formationCounts: Record<string, { titre: string; count: number }> = {};
    for (const s of sessions) {
      const key = s.formation.id;
      if (!formationCounts[key]) {
        formationCounts[key] = { titre: s.formation.titre, count: 0 };
      }
      formationCounts[key].count += s._count.inscriptions;
    }
    const topFormations = Object.values(formationCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top 5 formateurs by sessions
    const formateurCounts: Record<string, { nom: string; count: number }> = {};
    for (const s of sessions) {
      if (s.formateur) {
        const key = s.formateur.id;
        if (!formateurCounts[key]) {
          formateurCounts[key] = {
            nom: `${s.formateur.prenom} ${s.formateur.nom}`,
            count: 0,
          };
        }
        formateurCounts[key].count += 1;
      }
    }
    const topFormateurs = Object.values(formateurCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Repartition des sessions par statut
    const statutCounts: Record<string, number> = {};
    for (const s of allSessions) {
      statutCounts[s.statut] = (statutCounts[s.statut] || 0) + 1;
    }

    return NextResponse.json({
      months: monthLabels,
      revenueByMonth,
      sessionsByMonth,
      inscriptionsByMonth,
      fillRateByMonth,
      topFormations,
      topFormateurs,
      statutCounts,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Erreur analytics" }, { status: 500 });
  }
}
