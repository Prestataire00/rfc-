export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAllAdmins } from "@/lib/notifications";
import { withErrorHandler } from "@/lib/api-wrapper";

// Cron : détection automatique des factures en retard
// Passe en "en_retard" toutes les factures "envoyee" dont l'échéance est dépassée
export const GET = withErrorHandler(async (req: NextRequest) => {
  // Secret OBLIGATOIRE — pas de laisser-passer si non configuré
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 401 });
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const facturesEnRetard = await prisma.facture.findMany({
    where: {
      statut: "envoyee",
      dateEcheance: { lt: now },
    },
    include: {
      entreprise: { select: { nom: true } },
    },
  });

  if (facturesEnRetard.length === 0) {
    return NextResponse.json({ updated: 0, timestamp: now.toISOString() });
  }

  // Mise à jour en lot
  await prisma.facture.updateMany({
    where: {
      id: { in: facturesEnRetard.map((f) => f.id) },
    },
    data: { statut: "en_retard" },
  });

  // Une notification par facture passée en retard
  for (const facture of facturesEnRetard) {
    const entrepriseNom = facture.entreprise?.nom ?? "Client inconnu";
    await notifyAllAdmins({
      titre: "Facture en retard",
      message: `La facture ${facture.numero} (${facture.montantTTC.toFixed(2)}€) de ${entrepriseNom} est en retard de paiement`,
      type: "warning",
      lien: `/commercial/factures/${facture.id}`,
    });
  }

  return NextResponse.json({
    updated: facturesEnRetard.length,
    factures: facturesEnRetard.map((f) => f.numero),
    timestamp: now.toISOString(),
  });
});
