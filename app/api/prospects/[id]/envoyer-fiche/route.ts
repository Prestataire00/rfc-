// POST /api/prospects/[id]/envoyer-fiche
// Envoi (ou ré-envoi) de la fiche pré-formation pour la Demande [id].
// Idempotent : si une fiche existe déjà pour la demande, on la réutilise
// (et on met à jour destinataire). Sinon on en crée une nouvelle.
// L'admin peut déclencher cet endpoint si l'envoi auto du POST /api/prospects
// a échoué (Resend KO, email manquant à la création, etc.).

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { sendEmail, fichePreFormationEntrepriseEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

export const POST = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const demande = await prisma.demande.findUnique({
      where: { id: params.id },
      include: {
        contact: true,
        entreprise: { select: { id: true, nom: true, secteur: true, effectif: true } },
        formation: { select: { id: true, titre: true } },
      },
    });
    if (!demande) {
      return NextResponse.json({ error: "Prospect introuvable" }, { status: 404 });
    }
    if (!demande.contact?.email) {
      return NextResponse.json(
        { error: "Le contact rattaché à la demande n'a pas d'email" },
        { status: 422 },
      );
    }

    const destinataireNom = `${demande.contact.prenom} ${demande.contact.nom}`;
    const destinataireEmail = demande.contact.email;

    // Idempotence : on cherche une fiche déjà attachée à la demande.
    let fiche = await prisma.fichePreFormationEntreprise.findFirst({
      where: { demandeId: demande.id },
      orderBy: { createdAt: "desc" },
    });
    if (!fiche) {
      fiche = await prisma.fichePreFormationEntreprise.create({
        data: {
          demandeId: demande.id,
          entrepriseId: demande.entrepriseId,
          formationId: demande.formationId,
          tokenAcces: randomBytes(24).toString("hex"),
          statut: "en_attente",
          destinataireNom,
          destinataireEmail,
          secteurActivite: demande.entreprise?.secteur ?? null,
          effectifTotal: demande.entreprise?.effectif ?? null,
        },
      });
    } else if (fiche.destinataireEmail !== destinataireEmail || fiche.destinataireNom !== destinataireNom) {
      // Mise à jour si le contact a changé entre temps
      fiche = await prisma.fichePreFormationEntreprise.update({
        where: { id: fiche.id },
        data: { destinataireEmail, destinataireNom },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const titre = demande.formation?.titre || demande.titre || "votre formation";
    const mail = fichePreFormationEntrepriseEmail({
      destinataireNom,
      entreprise: { nom: demande.entreprise?.nom || "" },
      formation: { titre },
      session: null,
      link: `${baseUrl}/qualiopi/fiche-entreprise/${fiche.tokenAcces}`,
    });
    const envoi = await sendEmail({
      to: destinataireEmail,
      subject: mail.subject,
      html: mail.html,
    });

    if (envoi.skipped) {
      return NextResponse.json(
        {
          error: "Email non envoyé (service mail non configuré ou destinataire refusé). Vérifiez RESEND_API_KEY et l'adresse du contact.",
          ficheId: fiche.id,
          tokenAcces: fiche.tokenAcces,
        },
        { status: 502 },
      );
    }

    fiche = await prisma.fichePreFormationEntreprise.update({
      where: { id: fiche.id },
      data: { statut: "envoye", dateEnvoi: new Date() },
    });

    try {
      await logAction({
        action: "fiche_pre_formation_envoyee",
        label: `Fiche pré-formation envoyée à ${destinataireEmail} (depuis prospect)`,
        lien: `/prospects/${demande.id}`,
        contactId: demande.contactId ?? undefined,
        entrepriseId: demande.entrepriseId ?? undefined,
      });
    } catch (logErr) {
      logger.warn("historique.fiche_envoyee_failed", { error: String(logErr) });
    }

    return NextResponse.json({
      success: true,
      ficheId: fiche.id,
      tokenAcces: fiche.tokenAcces,
      destinataireEmail,
    });
  },
);
