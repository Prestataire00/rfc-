export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { notifyAllAdmins } from "@/lib/notifications";
import { withErrorHandler } from "@/lib/api-wrapper";
import {
  decideRelance,
  tierLabel,
  type ReminderTier,
} from "@/lib/factures/relances";

/**
 * Cron : relances de paiement graduées sur les factures en retard.
 *
 * Politique fixe (cf lib/factures/relances.ts) : J+7 / J+14 / J+30 avec
 * anti-spam de 3 jours minimum entre 2 relances.
 *
 * À appeler après /api/cron/factures (qui passe les "envoyee" échues en
 * "en_retard"). Cf .github/workflows/cron.yml pour la séquence.
 *
 * Auth : Bearer CRON_SECRET (header Authorization).
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET non configuré" },
      { status: 401 },
    );
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const factures = await prisma.facture.findMany({
    where: {
      statut: "en_retard",
      nbRappelsEnvoyes: { lt: 3 },
    },
    select: {
      id: true,
      numero: true,
      montantTTC: true,
      dateEcheance: true,
      statut: true,
      nbRappelsEnvoyes: true,
      dernierRappelEnvoyeAt: true,
      entrepriseId: true,
      entreprise: { select: { nom: true, email: true } },
      devis: { select: { contact: { select: { email: true, nom: true, prenom: true } } } },
    },
  });

  const stats = { scanned: 0, sent: 0, skipped: 0, failed: 0 };

  for (const f of factures) {
    stats.scanned++;
    const decision = decideRelance({
      now,
      dateEcheance: f.dateEcheance,
      statut: f.statut,
      nbRappelsEnvoyes: f.nbRappelsEnvoyes,
      dernierRappelEnvoyeAt: f.dernierRappelEnvoyeAt,
    });

    if (decision.kind === "skip") {
      stats.skipped++;
      continue;
    }

    const recipient =
      f.devis?.contact?.email ?? f.entreprise?.email ?? null;

    if (!recipient) {
      stats.failed++;
      console.error(
        `[cron-relances] facture ${f.numero} : aucun email destinataire`,
      );
      continue;
    }

    try {
      const labels = tierLabel(decision.tier);
      const entrepriseNom = f.entreprise?.nom ?? "Client";
      await sendEmail({
        to: recipient,
        subject: `${labels.subject} — ${f.numero}`,
        html: renderRelanceEmail({
          tier: decision.tier,
          numero: f.numero,
          montantTTC: f.montantTTC,
          dateEcheance: f.dateEcheance,
          entrepriseNom,
        }),
      });

      await prisma.facture.update({
        where: { id: f.id },
        data: {
          nbRappelsEnvoyes: { increment: 1 },
          dernierRappelEnvoyeAt: now,
        },
      });

      stats.sent++;

      if (decision.tier === 3) {
        // Mise en demeure : notifier les admins, c'est un événement métier
        // important qui peut nécessiter une action commerciale en suivant.
        await notifyAllAdmins({
          titre: "Mise en demeure envoyée",
          message: `Facture ${f.numero} (${f.montantTTC.toFixed(2)}€) — ${entrepriseNom}. 3e relance envoyée.`,
          type: "warning",
          lien: `/commercial/factures/${f.id}`,
        });
      }
    } catch (err) {
      stats.failed++;
      console.error(
        `[cron-relances] échec envoi pour facture ${f.numero} :`,
        err,
      );
    }
  }

  return NextResponse.json({ ...stats, timestamp: now.toISOString() });
});

function renderRelanceEmail(input: {
  tier: ReminderTier;
  numero: string;
  montantTTC: number;
  dateEcheance: Date;
  entrepriseNom: string;
}): string {
  const dateStr = input.dateEcheance.toLocaleDateString("fr-FR");
  const montant = input.montantTTC.toFixed(2);

  const tierBody: Record<ReminderTier, string> = {
    1: `Sauf erreur de notre part, nous n'avons pas encore reçu le règlement de la facture <strong>${input.numero}</strong> d'un montant de <strong>${montant} €</strong>, dont l'échéance était fixée au ${dateStr}. Nous vous remercions de bien vouloir procéder à son règlement dans les meilleurs délais.`,
    2: `Notre relance courtoise du <em>palier précédent</em> est restée sans réponse. La facture <strong>${input.numero}</strong> (<strong>${montant} €</strong>, échéance ${dateStr}) demeure impayée. Nous vous prions de bien vouloir régulariser sous huitaine.`,
    3: `<strong>MISE EN DEMEURE</strong> — Malgré nos précédentes relances, la facture <strong>${input.numero}</strong> d'un montant de <strong>${montant} €</strong> (échéance ${dateStr}) reste impayée. Sans règlement sous 15 jours à compter de la présente, nous nous réservons le droit d'engager toute procédure de recouvrement, frais et intérêts à votre charge en application des dispositions légales (art. L441-10 et L441-11 du Code de commerce).`,
  };

  return `<!doctype html>
<html lang="fr">
  <body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: auto;">
    <p>Bonjour,</p>
    <p>${tierBody[input.tier]}</p>
    <p>Nous restons à votre disposition pour tout échange.</p>
    <p>Cordialement,<br />L'équipe RFC</p>
  </body>
</html>`;
}
