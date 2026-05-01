export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { applyVariables } from "@/lib/message-templates";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

// POST /api/campaigns/[id]/send
// Envoie la campagne aux contacts correspondant au segment.
// Respecte l'opt-out RGPD.
//
// Note transactions : sendEmail est un effet de bord externe non-rollbackable,
// donc on le sort de toute prisma.$transaction. Chaque iteration ecrit son
// upsert independamment (idempotent par campaignId+contactId) pour qu'un retry
// reprenne sans dupliquer. La MAJ finale de la campagne est une operation
// unique, ne necessite pas de tx.
export const POST = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const campaign = await prisma.marketingCampaign.findUnique({ where: { id: params.id } });
  if (!campaign) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (campaign.statut === "envoyee") return NextResponse.json({ error: "Deja envoyee" }, { status: 400 });
  if (campaign.type !== "email") return NextResponse.json({ error: "Seul l'email est supporte pour l'instant" }, { status: 400 });

  // Parser le segment
  let segment: { tags?: string[]; type?: string; formations?: string[] } = {};
  try { segment = JSON.parse(campaign.segmentConfig); } catch { /* keep empty */ }

  // Construire le filtre contacts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { optOutMarketing: false };
  if (segment.type) where.type = segment.type;
  if (segment.tags && segment.tags.length > 0) {
    where.tags = { some: { tagId: { in: segment.tags } } };
  }
  if (segment.formations && segment.formations.length > 0) {
    where.inscriptions = {
      some: { session: { formationId: { in: segment.formations } } },
    };
  }

  const contacts = await prisma.contact.findMany({
    where,
    select: { id: true, email: true, nom: true, prenom: true },
  });

  // Exclure les opt-out globaux
  const optOuts = await prisma.marketingOptOut.findMany({ select: { email: true } });
  const optOutEmails = new Set(optOuts.map((o) => o.email.toLowerCase()));
  const recipients = contacts.filter((c) => !optOutEmails.has(c.email.toLowerCase()));

  let sent = 0;
  let errors = 0;

  for (const contact of recipients) {
    try {
      // Rendre le contenu avec les variables
      const subject = campaign.objet
        ? applyVariables(campaign.objet, { stagiaire: { prenom: contact.prenom, nom: contact.nom } })
        : campaign.nom;
      const html = campaign.contenu
        ? applyVariables(campaign.contenu, { stagiaire: { prenom: contact.prenom, nom: contact.nom } })
        : `<p>Bonjour ${contact.prenom},</p><p>${campaign.description || campaign.nom}</p>`;

      // Ajouter le lien de desinscription RGPD
      const baseUrl = process.env.NEXTAUTH_URL || "https://projetrfc.netlify.app";
      const unsubLink = `${baseUrl}/api/campaigns/unsubscribe?email=${encodeURIComponent(contact.email)}`;
      const htmlWithUnsub = html + `<p style="color:#94a3b8;font-size:11px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;">Pour ne plus recevoir ces communications, <a href="${unsubLink}" style="color:#94a3b8;">cliquez ici</a>.</p>`;

      // sendEmail HORS tx (effet de bord externe non-rollbackable).
      await sendEmail({ to: contact.email, subject, html: htmlWithUnsub });

      await prisma.campaignRecipient.upsert({
        where: { campaignId_contactId: { campaignId: campaign.id, contactId: contact.id } },
        create: { campaignId: campaign.id, contactId: contact.id, statut: "sent", sentAt: new Date() },
        update: { statut: "sent", sentAt: new Date() },
      });
      sent++;
    } catch (err) {
      errors++;
      logger.warn("campaign.send_recipient_failed", {
        campaignId: campaign.id,
        contactId: contact.id,
        error: String(err),
      });
      await prisma.campaignRecipient.upsert({
        where: { campaignId_contactId: { campaignId: campaign.id, contactId: contact.id } },
        create: { campaignId: campaign.id, contactId: contact.id, statut: "bounced" },
        update: { statut: "bounced" },
      });
    }
  }

  // Mettre a jour la campagne
  await prisma.marketingCampaign.update({
    where: { id: campaign.id },
    data: {
      statut: "envoyee",
      dateEnvoyee: new Date(),
      nbDestinataires: recipients.length,
      nbEnvoyes: sent,
    },
  });

  return NextResponse.json({ sent, errors, total: recipients.length });
});
