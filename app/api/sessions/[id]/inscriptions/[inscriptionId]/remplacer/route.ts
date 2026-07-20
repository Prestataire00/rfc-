export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { remplacerStagiaireSchema } from "@/lib/validations/inscription";
import { logAction } from "@/lib/historique";
import { notifyAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";

// POST /api/sessions/[id]/inscriptions/[inscriptionId]/remplacer
// Remplace un stagiaire indisponible (X) par un autre (Y) sur la même session,
// sans refaire le devis/la session.
//   - X : passe en statut "remplace" (conservé pour l'historique Qualiopi),
//     ses liens d'émargement non utilisés sont expirés.
//   - Y : nouvelle inscription "confirmee" (contact existant ou créé) → reçoit
//     automatiquement convention + programme + fiche pré-formation, et le cron
//     quotidien lui enverra ses liens d'émargement (il est confirmé).
export const POST = withErrorHandlerParams(
  async (req: NextRequest, { params }: { params: { id: string; inscriptionId: string } }) => {
    const data = await parseBody(req, remplacerStagiaireSchema);

    const x = await prisma.inscription.findUnique({
      where: { id: params.inscriptionId },
      include: { contact: true },
    });
    if (!x || x.sessionId !== params.id) {
      return NextResponse.json({ error: "Inscription introuvable pour cette session" }, { status: 404 });
    }
    if (x.statut === "remplace") {
      return NextResponse.json({ error: "Ce stagiaire a déjà été remplacé" }, { status: 409 });
    }

    const parseNaissance = (s?: string | null): Date | null => {
      if (!s || !s.trim()) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    // Résoudre / créer le remplaçant Y.
    let yContactId: string;
    if (data.newContact) {
      const email = data.newContact.email.toLowerCase();
      const identite = {
        prenom: data.newContact.prenom,
        nom: data.newContact.nom,
        dateNaissance: parseNaissance(data.newContact.dateNaissance),
        sexe: data.newContact.sexe ?? undefined,
        lieuNaissance: data.newContact.lieuNaissance ?? undefined,
      };
      const y = await prisma.contact.upsert({
        where: { email },
        create: { email, type: "stagiaire", entrepriseId: x.contact.entrepriseId ?? undefined, ...identite },
        update: { entrepriseId: x.contact.entrepriseId ?? undefined, ...identite },
        select: { id: true },
      });
      yContactId = y.id;
    } else {
      const y = await prisma.contact.findUnique({ where: { id: data.contactId! }, select: { id: true } });
      if (!y) return NextResponse.json({ error: "Contact remplaçant introuvable" }, { status: 404 });
      yContactId = y.id;
    }

    if (yContactId === x.contactId) {
      return NextResponse.json({ error: "Le remplaçant doit être différent du stagiaire remplacé" }, { status: 400 });
    }

    const nomX = `${x.contact.prenom} ${x.contact.nom}`;
    const dateFr = new Date().toLocaleDateString("fr-FR");

    const yInscription = await prisma.$transaction(async (tx) => {
      // Y : inscription active (upsert car unique [contactId, sessionId] — Y a pu
      // être déjà inscrit puis annulé sur cette session).
      const yInsc = await tx.inscription.upsert({
        where: { contactId_sessionId: { contactId: yContactId, sessionId: params.id } },
        update: { statut: "confirmee", notes: `Remplace ${nomX} (${dateFr})` },
        create: {
          contactId: yContactId,
          sessionId: params.id,
          statut: "confirmee",
          notes: `Remplace ${nomX} (${dateFr})`,
        },
        select: { id: true },
      });

      // X : marqué remplacé + trace du remplaçant dans les notes.
      const contactY = await tx.contact.findUnique({
        where: { id: yContactId },
        select: { prenom: true, nom: true },
      });
      await tx.inscription.update({
        where: { id: x.id },
        data: {
          statut: "remplace",
          notes: `Remplacé par ${contactY?.prenom ?? ""} ${contactY?.nom ?? ""} le ${dateFr} (indisponibilité)`.trim(),
        },
      });

      // Désactive les liens d'émargement non encore utilisés de X sur cette session.
      await tx.emargementToken.updateMany({
        where: { sessionId: params.id, contactId: x.contactId, usedAt: null },
        data: { expiresAt: new Date(0) },
      });

      return yInsc;
    });

    // Suivi post-inscription pour Y (fire-and-forget) : fiche + convention + programme.
    import("@/lib/automations/auto-fiches-pre-formation")
      .then(({ autoCreateFicheStagiaireOnInscription }) =>
        autoCreateFicheStagiaireOnInscription(yInscription.id).catch((err) =>
          logger.warn("remplacement.fiche-stagiaire-failed", { error: String(err) }),
        ),
      )
      .catch(() => {});
    import("@/lib/automations/auto-convention")
      .then(({ sendConventionOnInscription }) =>
        sendConventionOnInscription(yInscription.id).catch((err) =>
          logger.warn("remplacement.convention-failed", { error: String(err) }),
        ),
      )
      .catch(() => {});
    import("@/lib/automations/auto-programme")
      .then(({ sendProgrammeOnInscription }) =>
        sendProgrammeOnInscription(yInscription.id).catch((err) =>
          logger.warn("remplacement.programme-failed", { error: String(err) }),
        ),
      )
      .catch(() => {});

    const contactY = await prisma.contact.findUnique({
      where: { id: yContactId },
      select: { prenom: true, nom: true, email: true, entrepriseId: true },
    });

    await logAction({
      action: "stagiaire_remplace",
      label: `${nomX} remplacé(e) par ${contactY?.prenom ?? ""} ${contactY?.nom ?? ""} sur la session`,
      lien: `/sessions/${params.id}`,
      contactId: yContactId,
      entrepriseId: contactY?.entrepriseId ?? undefined,
      sessionId: params.id,
    }).catch(() => {});

    await notifyAdmins({
      titre: "Remplacement de stagiaire",
      message: `${nomX} → ${contactY?.prenom ?? ""} ${contactY?.nom ?? ""}. Convention, programme et fiche renvoyés au remplaçant.`,
      type: "info",
      lien: `/sessions/${params.id}`,
    }).catch(() => {});

    return NextResponse.json({ ok: true, inscriptionId: yInscription.id });
  },
);
